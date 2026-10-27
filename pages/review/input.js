import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'

const RATING_LABELS = ['', '要改善', 'もう少し', 'ふつう', 'よい', 'とてもよい']

// courseの値（10min/20min）から、1レッスンの分数を返す。
function durationFromCourse(course) {
  if (!course) return 10
  const m = String(course).match(/(\d+)/)
  if (!m) return 10
  return Number(m[1]) || 10
}

function getQueryValue(v) {
  if (Array.isArray(v)) return v[0]
  return v || ''
}

// ===== 固定コースの最終回（コーチ画面 coach.js と同じルール） =====
// 開始日から1ヶ月ごとに区切り、各月は「週回数×4回」まで。
const ENDED_GRACE_DAYS = 7 // 最終回からこの日数を過ぎた生徒はレビュー一覧から外す

function toDateKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function parseDateKey(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function addMonthsKey(dateKey, n) {
  const d = parseDateKey(dateKey)
  return toDateKey(new Date(d.getFullYear(), d.getMonth() + n, d.getDate()))
}

// 固定予約から今の契約の最終回(YYYY-MM-DD)を出す。開始日が無ければ null。
function fixedLastLesson(fixedBookings, profile) {
  const withStart = fixedBookings.filter((b) => b.start_date)
  if (withStart.length === 0) return null
  const start = withStart.map((b) => b.start_date).sort().at(-1)
  const current = withStart.filter((b) => b.start_date === start)
  const dows = [...new Set(current.map((b) => b.day_of_week))]
  const m = /^weekly(\d+)$/.exec(profile?.frequency || '')
  const perWeek = m ? Number(m[1]) : current.length
  const months = profile?.duration === '3month' || profile?.duration === '3months' ? 3 : 1
  const perMonth = perWeek * 4
  let last = null
  for (let i = 0; i < months; i += 1) {
    const monthStart = parseDateKey(addMonthsKey(start, i))
    const monthEnd = parseDateKey(addMonthsKey(start, i + 1))
    const dates = []
    for (let d = new Date(monthStart); d < monthEnd; d.setDate(d.getDate() + 1)) {
      if (dows.includes(d.getDay())) dates.push(toDateKey(d))
    }
    const used = dates.slice(0, perMonth)
    if (used.length > 0) last = used.at(-1)
  }
  return last
}

export default function ReviewInput() {
  const router = useRouter()
  const [coachId, setCoachId] = useState(null)
  const [members, setMembers] = useState([])
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [loadingMembers, setLoadingMembers] = useState(true)

  // レビューフォーム
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [nextPoint, setNextPoint] = useState('')
  const [isAbsent, setIsAbsent] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [done, setDone] = useState(false)

  // 既存レビュー（閲覧モード）
  const [existingReview, setExistingReview] = useState(null)
  const [isViewMode, setIsViewMode] = useState(false)
  const [checkingExisting, setCheckingExisting] = useState(false)

  // 教材（左パネル）
  const [materials, setMaterials] = useState(null)
  const [loadingMaterials, setLoadingMaterials] = useState(false)
  const [selectedCourseKey, setSelectedCourseKey] = useState('')
  const [selectedLessonId, setSelectedLessonId] = useState('')
  const [openSections, setOpenSections] = useState(new Set())

  // コーチメモ
  const [coachNote, setCoachNote] = useState('')
  const [noteSaving, setNoteSaving] = useState(false)
  const [noteSaved, setNoteSaved] = useState(false)

  const selectedMember = members.find((m) => m.id === selectedMemberId) || null

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      if (profile?.role !== 'coach') { router.push('/dashboard/student'); return }
      setCoachId(session.user.id)
    })
  }, [])

  // 担当生徒の読み込み
  useEffect(() => {
    if (!coachId || !router.isReady) return
    const load = async () => {
      setLoadingMembers(true)
      const { data: bookingRows } = await supabase
        .from('lesson_bookings')
        .select('student_id, booking_type, day_of_week, hour, minute, start_date, status')
        .eq('coach_id', coachId)
        .neq('status', 'cancelled')

      const studentIds = [...new Set((bookingRows || []).map((b) => b.student_id).filter(Boolean))]
      if (studentIds.length === 0) {
        setMembers([])
        setLoadingMembers(false)
        return
      }

      const { data: profileRows } = await supabase
        .from('profiles')
        .select('id, name, furigana, course, study_course, line_id, plan_type, frequency, duration')
        .in('id', studentIds)

      // 固定コースで、最終回から ENDED_GRACE_DAYS 日を過ぎた生徒（継続なし）は一覧から外す。
      // ただし、スケジュールのリンクから来た生徒（URLの student）は常に表示する。
      const graceDate = new Date()
      graceDate.setDate(graceDate.getDate() - ENDED_GRACE_DAYS)
      const graceKey = toDateKey(graceDate)
      const studentParam = getQueryValue(router.query.student)

      const activeProfiles = (profileRows || []).filter((p) => {
        if (p.id === studentParam) return true
        if (p.plan_type === 'flex') return true
        const fixed = (bookingRows || []).filter(
          (b) => b.student_id === p.id && b.booking_type !== 'flex' && b.status === 'approved'
        )
        const last = fixedLastLesson(fixed, p)
        if (!last) return true
        return last >= graceKey
      })

      const list = activeProfiles.map((p) => ({
        id: p.id,
        name: p.name || '未登録',
        furigana: p.furigana || '',
        course: p.course || '',
        studyCourse: p.study_course || '',
        lineId: p.line_id || '',
      }))
      setMembers(list)
      setLoadingMembers(false)
    }
    load()
  }, [coachId, router.isReady, router.query.student])

  // URLパラメータから生徒を選択
  useEffect(() => {
    if (!router.isReady || members.length === 0) return
    const studentParam = getQueryValue(router.query.student)
    if (studentParam && members.some((m) => m.id === studentParam)) {
      setSelectedMemberId(studentParam)
    }
  }, [router.isReady, router.query.student, members])

  // 選択中の生徒について、当日・同時刻のレビューがすでにあるか確認
  const checkExistingReview = async (memberId) => {
    if (!memberId || !coachId) return
    const dateParam = getQueryValue(router.query.date)
    if (!dateParam) {
      setExistingReview(null)
      setIsViewMode(false)
      return
    }
    // 同じ日に複数レッスン（通常＋補講など）があるため、時刻まで含めて既存レビューを探す。
    const hourParam = getQueryValue(router.query.hour)
    const minuteParam = getQueryValue(router.query.minute)
    setCheckingExisting(true)
    let query = supabase
      .from('reviews')
      .select('*')
      .eq('coach_id', coachId)
      .eq('student_id', memberId)
      .eq('lesson_date', dateParam)

    // URLに時刻がある場合は、その時刻のレビューだけを既存として扱う。
    // 時刻が一致するレビューがなければ「未記録」＝新規で書ける。
    if (hourParam !== '' && minuteParam !== '') {
      query = query.eq('lesson_hour', Number(hourParam)).eq('lesson_minute', Number(minuteParam))
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) {
      console.error('[review-input] check existing failed:', error)
      setCheckingExisting(false)
      return
    }

    if (data && data.length > 0) {
      setExistingReview(data[0])
      setIsViewMode(true)
      setRating(data[0].rating || 0)
      setComment(data[0].comment || '')
      setNextPoint(data[0].next_point || '')
      setIsAbsent(!!data[0].is_absent)
    } else {
      setExistingReview(null)
      setIsViewMode(false)
    }
    setCheckingExisting(false)
  }

  useEffect(() => {
    if (selectedMemberId && coachId) {
      checkExistingReview(selectedMemberId)
      loadCoachNote(selectedMemberId)
    }
  }, [selectedMemberId, coachId, router.query.date, router.query.hour, router.query.minute])

  // コーチメモの読み込み
  const loadCoachNote = async (memberId) => {
    if (!memberId || !coachId) return
    const { data } = await supabase
      .from('coach_notes')
      .select('note')
      .eq('coach_id', coachId)
      .eq('student_id', memberId)
      .maybeSingle()
    setCoachNote(data?.note || '')
  }

  const handleSaveNote = async () => {
    if (!coachId || !selectedMemberId) return
    setNoteSaving(true)
    setNoteSaved(false)
    const { error } = await supabase
      .from('coach_notes')
      .upsert({
        coach_id: coachId,
        student_id: selectedMemberId,
        note: coachNote,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'coach_id,student_id' })
    setNoteSaving(false)
    if (!error) {
      setNoteSaved(true)
      setTimeout(() => setNoteSaved(false), 2500)
    }
  }

  // 教材の読み込み
  useEffect(() => {
    if (!selectedMember) {
      setMaterials(null)
      return
    }
    const studyCourse = selectedMember.studyCourse
    if (!studyCourse) {
      setMaterials(null)
      return
    }
    // 学習コースに応じたコースキーの候補を用意
    const courseKeyMap = {
      '一般会話': 'step',
      'フリートーク入門': 'freetalk',
      '旅行韓国語': 'travel',
      'K-POPで韓国語': 'kpop',
      'ドラマで韓国語': 'drama',
    }
    const key = courseKeyMap[studyCourse] || ''
    setSelectedCourseKey(key)
  }, [selectedMember])

  useEffect(() => {
    if (!selectedCourseKey) return
    const loadMaterials = async () => {
      setLoadingMaterials(true)
      try {
        const mod = await import('../materials/[lessonId]')
        const data = mod.LESSON_DATA || {}
        setMaterials(data)
        // 最初のレッスンを選択
        const firstKey = Object.keys(data).find((k) => k.startsWith(selectedCourseKey))
        if (firstKey) setSelectedLessonId(firstKey)
      } catch (e) {
        console.error('[review-input] materials load failed:', e)
        setMaterials(null)
      }
      setLoadingMaterials(false)
    }
    loadMaterials()
  }, [selectedCourseKey])

  const toggleSection = (section) => {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      return next
    })
  }

  const handleSubmit = async () => {
    if (!coachId || !selectedMemberId) return
    if (!isAbsent && rating === 0) {
      setSaveError('評価を選択してください')
      return
    }
    setSaving(true)
    setSaveError('')

    const dateParam = getQueryValue(router.query.date)
    // レッスンの分数は生徒のコース(10min/20min)から決まる。
    // 20分レッスンは1件のレビュー(duration_min=20)で完結する（＝¥1,000）。
    // 以前あった「連続授業として後半10分も記録する」ボタンは、20分本体に加えて
    // duration_min=10の2件目を作り、報酬が¥1,500に二重計上される不具合があったため廃止した。
    const duration = durationFromCourse(selectedMember?.course)

    const payload = {
      student_id: selectedMemberId,
      coach_id: coachId,
      rating: isAbsent ? 0 : rating,
      comment: isAbsent ? '（欠席）' : comment,
      next_point: isAbsent ? '' : nextPoint,
      duration_min: duration,
      is_absent: isAbsent,
    }
    if (dateParam) payload.lesson_date = dateParam
    const bookingParam = getQueryValue(router.query.booking)
    if (bookingParam) payload.booking_id = bookingParam
    // このレビューが何時のレッスンぶんかを記録する（同じ日の複数レッスンを区別するため）。
    const hourParam = getQueryValue(router.query.hour)
    const minuteParam = getQueryValue(router.query.minute)
    if (hourParam !== '') payload.lesson_hour = Number(hourParam)
    if (minuteParam !== '') payload.lesson_minute = Number(minuteParam)

    const { error: insertError } = await supabase.from('reviews').insert(payload)
    if (insertError) {
      console.error('[review-input] insert failed:', insertError)
      setSaveError('保存に失敗しました。もう一度お試しください。')
      setSaving(false)
      return
    }

    setSaving(false)
    setDone(true)
  }

  // 教材セクション1件を、生徒画面と同じ内容（韓国語＋発音／品詞＋日本語）で表示する。
  // 教材データの実際のプロパティ名は kr（韓国語）・jp（日本語）・romanize（発音）・pos（品詞）。
  const renderMaterialItem = (section, item, i) => {
    if (typeof item === 'string') {
      return <div key={i} className="mb-2">{item}</div>
    }
    if (section === 'keyPhrases') {
      // キーフレーズ：韓国語 ＋ 発音 ＋ 日本語
      return (
        <div key={i} className="mb-3">
          <p className="font-bold text-[#A32D2D]">{item.kr}</p>
          {item.romanize && <p className="text-xs text-gray-400">{item.romanize}</p>}
          <p className="text-gray-600">{item.jp}</p>
        </div>
      )
    }
    if (section === 'vocabulary') {
      // 単語：韓国語 ＋ 品詞 ＋ 日本語
      return (
        <div key={i} className="mb-2 flex items-center justify-between gap-2">
          <span>
            <span className="font-bold text-[#A32D2D]">{item.kr}</span>
            {item.pos && <span className="ml-2 text-[11px] text-gray-400">{item.pos}</span>}
          </span>
          <span className="text-gray-600">{item.jp}</span>
        </div>
      )
    }
    if (section === 'conversation') {
      // 会話：話者 ＋ 韓国語 ＋ 日本語
      return (
        <div key={i} className="mb-3">
          <p className="font-bold text-gray-800">
            {item.speaker && <span className="text-[#0C447C] mr-1.5">{item.speaker}:</span>}
            {item.kr}
          </p>
          <p className="text-gray-600">{item.jp}</p>
        </div>
      )
    }
    // 想定外の形式は、韓国語・日本語をできる範囲で表示（フォールバック）。
    return (
      <div key={i} className="mb-2">
        <span className="font-bold text-[#A32D2D]">{item.kr || ''}</span>
        {item.jp && <span className="ml-2 text-gray-600">{item.jp}</span>}
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" style={{ fontFamily: "'Noto Sans KR', sans-serif" }}>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center max-w-md">
          <p className="text-4xl mb-4">✅</p>
          <p className="font-bold text-[#0C447C] text-lg mb-2">レビューを保存しました</p>
          <p className="text-sm text-gray-500 mb-6">お疲れさまでした。</p>
          <button
            onClick={() => router.push('/dashboard/coach')}
            className="rounded-xl bg-[#A32D2D] text-white font-bold px-6 py-3 hover:opacity-90 transition"
          >
            コーチページに戻る
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'Noto Sans KR', sans-serif" }}>
      <Head><title>レビュー入力 | 電話韓国語 チグム</title></Head>

      <header className="bg-white border-b border-gray-100 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/coach" className="text-sm text-gray-500 hover:text-gray-700">← コーチページ</Link>
          <span className="font-bold text-[#A32D2D] text-lg tracking-tight">レビュー入力</span>
        </div>
        <Link href="/review/coach-view" className="text-xs text-[#0C447C] border border-[#0C447C]/30 rounded-lg px-3 py-1.5 hover:bg-[#0C447C]/5 transition">
          📋 レビュー履歴を見る
        </Link>
      </header>

      <div className="max-w-6xl mx-auto p-4 md:p-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* 左パネル：教材 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-[#0C447C] mb-4">📚 教材</h2>
          {loadingMaterials ? (
            <p className="text-sm text-gray-400">読み込み中...</p>
          ) : !materials || !selectedMember?.studyCourse ? (
            <p className="text-sm text-gray-400">
              {selectedMember ? 'この生徒は学習コースが未設定です。' : '生徒を選択してください。'}
            </p>
          ) : (
            <>
              {materials && (
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">レッスン</label>
                  <select
                    value={selectedLessonId}
                    onChange={(e) => setSelectedLessonId(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#A32D2D]/40"
                  >
                    {Object.keys(materials)
                      .filter((k) => k.startsWith(selectedCourseKey))
                      .map((k) => (
                        <option key={k} value={k}>{materials[k]?.title || k}</option>
                      ))}
                  </select>
                </div>
              )}

              {materials[selectedLessonId] && (
                <div className="space-y-2">
                  {['keyPhrases', 'vocabulary', 'conversation', 'point'].map((section) => {
                    const sectionData = materials[selectedLessonId][section]
                    if (!sectionData) return null
                    const labels = {
                      keyPhrases: 'キーフレーズ',
                      vocabulary: '単語',
                      conversation: '会話',
                      point: 'ポイント',
                    }
                    const isOpen = openSections.has(section)
                    return (
                      <div key={section} className="border border-gray-100 rounded-xl overflow-hidden">
                        <button
                          onClick={() => toggleSection(section)}
                          className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition text-sm font-semibold text-gray-700"
                        >
                          <span>{labels[section]}</span>
                          <span className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}>▾</span>
                        </button>
                        {isOpen && (
                          <div className="px-4 py-3 text-sm text-gray-600 leading-relaxed">
                            {Array.isArray(sectionData)
                              ? sectionData.map((item, i) => renderMaterialItem(section, item, i))
                              : typeof sectionData === 'string'
                                ? <p className="whitespace-pre-line">{sectionData}</p>
                                : JSON.stringify(sectionData)}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* 右パネル：レビュー入力＋コーチメモ */}
        <div className="space-y-6">
          {/* 生徒選択 */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <label className="block text-sm font-bold text-[#0C447C] mb-2">生徒を選択</label>
            {loadingMembers ? (
              <p className="text-sm text-gray-400">読み込み中...</p>
            ) : (
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#A32D2D]/40"
              >
                <option value="">選択してください</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}（{m.furigana}）</option>
                ))}
              </select>
            )}
            {selectedMember && (
              <div className="mt-3 text-xs text-gray-500 space-y-0.5">
                <p>コース：{selectedMember.course || '未設定'}</p>
                <p>学習：{selectedMember.studyCourse || '未設定'}</p>
                <p>連絡先：{selectedMember.lineId ? `LINE(${selectedMember.lineId})` : '未設定'}</p>
              </div>
            )}
          </div>

          {/* コーチメモ */}
          {selectedMember && (
            <div className="bg-[#FFFBEB] rounded-2xl border border-[#FDE68A] shadow-sm p-5">
              <label className="block text-sm font-bold text-[#92400E] mb-2">📝 コーチメモ（この生徒専用・自分だけが見えます）</label>
              <textarea
                rows={3}
                value={coachNote}
                onChange={(e) => setCoachNote(e.target.value)}
                placeholder="この生徒についての覚え書き（レベル、性格、注意点など）"
                className="w-full rounded-xl border border-[#FDE68A] px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/40 resize-none"
              />
              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={handleSaveNote}
                  disabled={noteSaving}
                  className="rounded-lg bg-[#F59E0B] text-white text-xs font-bold px-4 py-2 hover:opacity-90 transition disabled:opacity-50"
                >
                  {noteSaving ? '保存中...' : 'メモを保存'}
                </button>
                {noteSaved && <span className="text-xs text-green-600 font-semibold">✅ 保存しました</span>}
              </div>
            </div>
          )}

          {/* レビューフォーム */}
          {selectedMember && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              {isViewMode ? (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold text-[#0C447C]">記録済みのレビュー</h2>
                    <span className="text-[11px] bg-green-50 text-green-600 border border-green-200 font-bold px-2 py-0.5 rounded-full">記録済み</span>
                  </div>
                  {existingReview?.is_absent ? (
                    <p className="text-sm text-orange-600 font-semibold">この日は欠席として記録されています。</p>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-semibold text-gray-400 mb-1">評価</p>
                        <p className="text-sm text-gray-700">{'★'.repeat(existingReview?.rating || 0)}{'☆'.repeat(5 - (existingReview?.rating || 0))} {RATING_LABELS[existingReview?.rating || 0]}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-400 mb-1">レビュー</p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{existingReview?.comment || '（なし）'}</p>
                      </div>
                      {existingReview?.next_point && (
                        <div>
                          <p className="text-xs font-semibold text-gray-400 mb-1">次回への課題</p>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{existingReview.next_point}</p>
                        </div>
                      )}
                    </div>
                  )}
                  <button
                    onClick={() => { setIsViewMode(false); setExistingReview(null); setRating(0); setComment(''); setNextPoint(''); setIsAbsent(false) }}
                    className="mt-5 text-xs text-[#A32D2D] underline"
                  >
                    別のレビューを新規で書く
                  </button>
                </div>
              ) : (
                <div>
                  <h2 className="text-sm font-bold text-[#0C447C] mb-4">レビューを書く</h2>

                  <label className="flex items-center gap-2 mb-4 text-sm text-gray-600">
                    <input type="checkbox" checked={isAbsent} onChange={(e) => setIsAbsent(e.target.checked)} className="h-4 w-4 accent-[#A32D2D]" />
                    生徒が欠席した
                  </label>

                  {!isAbsent && (
                    <>
                      <div className="mb-4">
                        <p className="text-xs font-semibold text-gray-500 mb-1.5">評価</p>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button
                              key={n}
                              onClick={() => setRating(n)}
                              className={`text-2xl transition ${n <= rating ? 'text-[#F59E0B]' : 'text-gray-200'}`}
                            >
                              ★
                            </button>
                          ))}
                        </div>
                        {rating > 0 && <p className="text-xs text-gray-400 mt-1">{RATING_LABELS[rating]}</p>}
                      </div>

                      <div className="mb-4">
                        <p className="text-xs font-semibold text-gray-500 mb-1.5">レビュー（生徒に表示されます）</p>
                        <textarea
                          rows={4}
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          placeholder="今日の練習の様子、よかった点など"
                          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#A32D2D]/40 resize-none"
                        />
                      </div>

                      <div className="mb-4">
                        <p className="text-xs font-semibold text-gray-500 mb-1.5">次回への課題（任意）</p>
                        <textarea
                          rows={2}
                          value={nextPoint}
                          onChange={(e) => setNextPoint(e.target.value)}
                          placeholder="次回に向けてのアドバイスなど"
                          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#A32D2D]/40 resize-none"
                        />
                      </div>
                    </>
                  )}

                  {saveError && <p className="text-sm text-red-500 mb-3">{saveError}</p>}

                  <button
                    onClick={handleSubmit}
                    disabled={saving}
                    className="w-full rounded-xl bg-[#A32D2D] text-white font-bold py-3 hover:opacity-90 transition disabled:opacity-50"
                  >
                    {saving ? '保存中...' : 'レビューを保存する'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}