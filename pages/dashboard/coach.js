import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'
import CoachMakeup from '../../components/CoachMakeup'

const MENU = [
  { id: 'today',        label: '本日のスケジュール', icon: '📋' },
  { id: 'week',         label: '週間スケジュール',   icon: '📅' },
  { id: 'students',     label: '担当生徒の契約期間', icon: '🗓️' },
  { id: 'review',       label: 'レビュー入力',       icon: '✏️' },
  { id: 'reward',       label: '報酬確認',           icon: '💴' },
  { id: 'availability', label: '受講可能時間の設定', icon: '⚙️' },
  { id: 'approvals',    label: '承認待ち一覧',       icon: '🔓' },
  { id: 'makeup',       label: '補講管理',           icon: '🔁' },
  { id: 'bookings',    label: '予約申請一覧',        icon: '📩' },
]

const MOCK_SCHEDULE = [
  { id: 1, time: '10:00', member: '田中 花子', method: 'LINE', contact: 'hanako_tanaka', material: '初級テキスト Vol.1 / Unit 5', note: '先週の続きから。発音を重点的に。', reviewed: false },
  { id: 2, time: '13:00', member: '佐藤 太郎', method: 'LINE', contact: 'taro_sato', material: '中級会話テキスト / Chapter 3', note: '', reviewed: true },
  { id: 3, time: '19:00', member: '山田 あかり', method: 'LINE', contact: 'akari_y', material: '初級テキスト Vol.2 / Unit 2', note: '仕事後なので少し遅れる可能性あり', reviewed: false },
]

const DAYS = ['日', '月', '火', '水', '木', '金', '土']
const START_H = 6
const END_H = 23

// 報酬単価。通常レッスンは「10分あたり ¥500」で、レッスン長に比例する（10分=¥500 / 20分=¥1,000）。
// 欠席処理は長さに関わらず一律 ¥200。
const REWARD_NORMAL = 500
const REWARD_ABSENT = 200

// レビュー1件の報酬額を計算する。
// ・欠席（is_absent）はレッスン長に関わらず一律 REWARD_ABSENT（¥200）。
// ・通常レッスンは duration_min に応じて10分ごとに REWARD_NORMAL（¥500）。10分=500 / 20分=1000。
//   duration_min が未記録の旧データは10分とみなす（従来どおり¥500）。
function rewardForReview(review) {
  if (review.is_absent) return REWARD_ABSENT
  const dur = review.duration_min || 10
  return Math.round(dur / 10) * REWARD_NORMAL
}

function getSlots() {
  const slots = []
  for (let h = START_H; h < END_H; h++) {
    for (let m = 0; m < 60; m += 10) slots.push({ h, m })
  }
  return slots
}
const SLOTS = getSlots()

function initGrid() {
  const s = {}
  DAYS.forEach((_, di) => SLOTS.forEach(({ h, m }) => { s[`${di}-${h}-${m}`] = false }))
  return s
}

// レビューを「生徒＋日付＋時刻」で識別するキーを作る。
// 同じ日に複数レッスン（通常＋補講など）があっても、時刻で別レビューとして区別するため。
// 時刻が未記録（旧データ）の場合は時刻なしキーにフォールバックする。
function reviewKey(studentId, dateStr, hour, minute) {
  if (hour === null || hour === undefined || minute === null || minute === undefined) {
    return `${studentId}:${dateStr}`
  }
  return `${studentId}:${dateStr}:${hour}:${minute}`
}

function formatProfileContact(profile) {
  if (!profile) return ''
  const contact = profile.line_id || ''
  if (!contact) return 'LINE'
  return `LINE(${contact})`
}

// 指定した日付(dateStr: 'YYYY-MM-DD')が、予約の開始日(start_date)以降かどうかを判定する。
// start_dateが未設定(null)の予約は、従来どおり常に表示対象とする（後方互換）。
function isOnOrAfterStart(booking, dateStr) {
  if (!booking || !booking.start_date) return true
  return dateStr >= booking.start_date
}

// 日付(Date)を 'YYYY-MM-DD' に変換する共通ヘルパー。
function toDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// confirmed_at(timestamptz)から、その補講の「日付キー(YYYY-MM-DD)」を取り出す。
function makeupDateKey(confirmedAt) {
  if (!confirmedAt) return null
  const d = new Date(confirmedAt)
  return toDateKey(d)
}

// confirmed_at から時・分を取り出す。
function makeupHourMinute(confirmedAt) {
  const d = new Date(confirmedAt)
  return { hour: d.getHours(), minute: d.getMinutes() }
}

// ある予約が、指定した日付(dateStr)・曜日(dow)に表示すべきかを判定する。
// ・フレックス予約(booking_type='flex')は、booking_dateがその日付と一致するときだけ表示。
// ・固定予約は、day_of_weekがその曜日と一致し、かつstart_dateがその日付以前のときだけ表示。
function bookingShowsOnDate(booking, dateStr, dow) {
  if (booking.booking_type === 'flex') {
    return booking.booking_date === dateStr
  }
  return booking.day_of_week === dow && isOnOrAfterStart(booking, dateStr)
}

// ===== 契約期間（いつまでか）の計算 =====
// ルール：開始日から1ヶ月ごとに区切り、各月は「週回数×4回」まで。
// 同じ月の中の5回目以降（5週目）は契約外。
// 例）週1・3ヶ月・8/1開始 → 8/1〜8/31で4回、9/1〜9/30で4回（9/29は契約外）、10/1〜10/31で4回。

// 'YYYY-MM-DD' を Date(ローカル) に変換する。
function parseDateKey(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// 'YYYY-MM-DD' に nヶ月足した 'YYYY-MM-DD' を返す。
function addMonthsKey(dateKey, n) {
  const d = parseDateKey(dateKey)
  return toDateKey(new Date(d.getFullYear(), d.getMonth() + n, d.getDate()))
}

// 'weekly3' → 3。読めなければ null。
function perWeekFromFrequency(frequency) {
  const m = /^weekly(\d+)$/.exec(frequency || '')
  return m ? Number(m[1]) : null
}

// '3month' / '3months' → 3、それ以外 → 1。
function monthsFromDuration(duration) {
  return duration === '3month' || duration === '3months' ? 3 : 1
}

// 'YYYY-MM-DD' → 'M/D'
function shortDate(dateKey) {
  if (!dateKey) return ''
  const d = parseDateKey(dateKey)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

// 固定コースの契約情報を計算する。
// fixedBookings: その生徒の承認済み固定予約（同じ start_date のものが今の契約）
function computeFixedContract(fixedBookings, profile) {
  const withStart = fixedBookings.filter((b) => b.start_date)
  if (withStart.length === 0) return null

  // 継続で新しい予約ができている場合に備え、一番新しい開始日を今の契約とする。
  const start = withStart.map((b) => b.start_date).sort().at(-1)
  const current = withStart.filter((b) => b.start_date === start)
  const dows = [...new Set(current.map((b) => b.day_of_week))]
  const perWeek = perWeekFromFrequency(profile?.frequency) || current.length
  const months = profile?.__months || monthsFromDuration(profile?.duration)
  const perMonth = perWeek * 4

  const lessonDates = new Set()
  let lastLesson = null
  for (let i = 0; i < months; i += 1) {
    const monthStart = parseDateKey(addMonthsKey(start, i))
    const monthEnd = parseDateKey(addMonthsKey(start, i + 1)) // この日は含まない
    const dates = []
    for (let d = new Date(monthStart); d < monthEnd; d.setDate(d.getDate() + 1)) {
      if (dows.includes(d.getDay())) dates.push(toDateKey(d))
    }
    dates.slice(0, perMonth).forEach((key) => {
      lessonDates.add(key)
      lastLesson = key
    })
  }

  return {
    type: 'fixed',
    start,
    months,
    perWeek,
    total: perMonth * months,
    lessonDates,
    lastLesson,
  }
}

// 指定日のレッスンが契約上どういう扱いかを返す。
// 'last' = 最終回 / 'outside' = 契約外 / null = 通常
function fixedLessonStatus(contract, dateKey) {
  if (!contract || contract.type !== 'fixed') return null
  if (dateKey < contract.start) return null
  if (!contract.lessonDates.has(dateKey)) return 'outside'
  if (dateKey === contract.lastLesson) return 'last'
  return null
}

// 固定予約が、その日に契約外（契約終了後・5週目）かどうか。
// 契約外ならスケジュールに表示しない。フレックス予約・契約情報なしは従来どおり表示。
function isOutsideFixedContract(booking, contractMap, dateKey) {
  if (booking.booking_type === 'flex') return false
  const entry = contractMap[booking.student_id]
  // その予約自身の開始日の契約で判定する（継続で古い予約が残っていても重複表示しない）。
  const contract = (booking.start_date && entry?.contractsByStart?.[booking.start_date]) || entry?.contract
  return fixedLessonStatus(contract, dateKey) === 'outside'
}

// 担当生徒（profiles.coach_id）と承認済み予約のある生徒について、契約情報をまとめて取得する。
// 戻り値：{ [studentId]: { profile, contract } }
async function fetchContractMap(coachId) {
  const { data: bookingRows, error: bookingError } = await supabase
    .from('lesson_bookings')
    .select('id, student_id, day_of_week, start_date, booking_type, status')
    .eq('coach_id', coachId)
    .eq('status', 'approved')

  if (bookingError) {
    console.error('[contract] fetch bookings failed:', bookingError)
    return {}
  }

  const { data: assignedRows } = await supabase
    .from('profiles')
    .select('id')
    .eq('coach_id', coachId)

  const studentIds = [...new Set([
    ...(bookingRows || []).map((b) => b.student_id),
    ...(assignedRows || []).map((p) => p.id),
  ].filter(Boolean))]
  if (studentIds.length === 0) return {}

  const { data: profileRows } = await supabase
    .from('profiles')
    .select('id, name, furigana, plan_type, course, frequency, duration')
    .in('id', studentIds)

  // フレックスのチケット（読めない場合は空のまま）
  const flexIds = (profileRows || []).filter((p) => p.plan_type === 'flex').map((p) => p.id)
  let ticketRows = []
  if (flexIds.length > 0) {
    const { data, error } = await supabase
      .from('ticket_balance')
      .select('student_id, remaining, expires_at')
      .in('student_id', flexIds)
    if (error) console.error('[contract] fetch tickets failed:', error)
    ticketRows = data || []
  }

  const result = {}
  ;(profileRows || []).forEach((profile) => {
    if (profile.plan_type === 'flex') {
      // 有効期限が一番遅いチケットを今の契約とする。
      const ticket = ticketRows
        .filter((t) => t.student_id === profile.id)
        .sort((a, b) => (a.expires_at || '').localeCompare(b.expires_at || ''))
        .at(-1)
      result[profile.id] = {
        profile,
        contract: {
          type: 'flex',
          remaining: ticket ? ticket.remaining : null,
          expiresAt: ticket ? ticket.expires_at : null,
        },
      }
      return
    }
    const fixed = (bookingRows || []).filter((b) => b.student_id === profile.id && b.booking_type !== 'flex')
    const contract = computeFixedContract(fixed, profile)

    // 継続で古い予約が残っている場合に備え、開始日ごとの契約も作る。
    // 一番新しい開始日は今の契約。それより前の開始日は「次の開始日の前日まで」の契約とし、
    // 回数は予約数（週の回数）で数える。
    const starts = [...new Set(fixed.filter((b) => b.start_date).map((b) => b.start_date))].sort()
    const contractsByStart = {}
    starts.forEach((start, idx) => {
      if (idx === starts.length - 1) {
        contractsByStart[start] = contract
        return
      }
      const nextStart = starts[idx + 1]
      let months = 1
      while (addMonthsKey(start, months) < nextStart) months += 1
      contractsByStart[start] = computeFixedContract(
        fixed.filter((b) => b.start_date === start),
        { __months: months }
      )
    })

    result[profile.id] = { profile, contract, contractsByStart }
  })
  return result
}

// スケジュール表の「備考」欄に出す契約表示。
function ContractNote({ contract, dateKey, isFlex, isMakeup }) {
  if (!contract || isMakeup) return null
  if (isFlex || contract.type === 'flex') {
    if (!contract.expiresAt) return null
    return (
      <span className="text-[11px] text-gray-500 whitespace-nowrap">
        チケット残{contract.remaining ?? '-'}・{shortDate(contract.expiresAt)}期限
      </span>
    )
  }
  const status = fixedLessonStatus(contract, dateKey)
  if (status === 'outside') {
    return (
      <span className="text-[11px] bg-red-50 text-red-600 border border-red-200 font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
        契約外（最終回は{shortDate(contract.lastLesson)}）
      </span>
    )
  }
  if (status === 'last') {
    return (
      <span className="text-[11px] bg-[#FFF8E1] text-[#F57F17] border border-[#FFE082] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
        最終回
      </span>
    )
  }
  if (dateKey < contract.start) return null
  return <span className="text-[11px] text-gray-400 whitespace-nowrap">最終回 {shortDate(contract.lastLesson)}</span>
}

// 担当生徒ごとの「いつまでか」一覧。
function StudentContractsTab({ coachId }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const todayKey = toDateKey(new Date())

  useEffect(() => {
    if (!coachId) return
    const load = async () => {
      setLoading(true)
      const map = await fetchContractMap(coachId)
      const list = Object.values(map).map(({ profile, contract }) => {
        const endKey = contract?.type === 'fixed' ? contract.lastLesson : contract?.expiresAt
        return { profile, contract, endKey: endKey || '' }
      })
      // 終わりが近い順（不明は最後）
      list.sort((a, b) => {
        if (!a.endKey) return 1
        if (!b.endKey) return -1
        return a.endKey.localeCompare(b.endKey)
      })
      setRows(list)
      setLoading(false)
    }
    load()
  }, [coachId])

  if (loading) return <p className="text-sm text-gray-400">読み込み中...</p>

  const courseLabel = (profile) => {
    const parts = []
    if (profile.course) parts.push(profile.course.replace('min', '分'))
    const perWeek = perWeekFromFrequency(profile.frequency)
    if (profile.plan_type === 'flex') {
      const m = /^monthly(\d+)$/.exec(profile.frequency || '')
      if (m) parts.push(`月${m[1]}回`)
    } else if (perWeek) {
      parts.push(`週${perWeek}回`)
    }
    parts.push(`${monthsFromDuration(profile.duration)}ヶ月`)
    return parts.join('・')
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-[#F0F7FF] border border-[#0C447C]/15 p-4">
        <p className="text-sm font-bold text-[#0C447C] mb-1">契約回数の数え方</p>
        <p className="text-xs text-gray-700 leading-relaxed">
          お申込み（開始日）から1ヶ月ごとに区切り、各月は「週の回数×4回」までです（週1なら4回、週3なら12回）。
          同じ月に5回目の曜日（5週目）がある場合、その日は契約外なのでレッスンはありません。
          最終回を過ぎても継続のお手続きがない生徒さんは、レッスンなしです。
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="min-w-[640px] w-full text-sm border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="bg-gray-100 text-gray-600 font-semibold px-3 py-2 text-left border-b border-gray-200">名前</th>
              <th className="bg-gray-100 text-gray-600 font-semibold px-3 py-2 text-left border-b border-gray-200">種別</th>
              <th className="bg-gray-100 text-gray-600 font-semibold px-3 py-2 text-left border-b border-gray-200">内容</th>
              <th className="bg-gray-100 text-gray-600 font-semibold px-3 py-2 text-left border-b border-gray-200">開始日</th>
              <th className="bg-gray-100 text-gray-600 font-semibold px-3 py-2 text-left border-b border-gray-200">最終回 / 期限</th>
              <th className="bg-gray-100 text-gray-600 font-semibold px-3 py-2 text-left border-b border-gray-200">残り</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-sm text-gray-400">担当の生徒さんはいません</td>
              </tr>
            ) : rows.map(({ profile, contract, endKey }) => {
              const isFlex = profile.plan_type === 'flex'
              const ended = endKey && endKey < todayKey
              const remaining = !contract
                ? null
                : contract.type === 'fixed'
                  ? [...contract.lessonDates].filter((d) => d >= todayKey).length
                  : contract.remaining
              return (
                <tr key={profile.id} className={ended ? 'bg-gray-50' : 'odd:bg-white even:bg-[#F6FAFF]'}>
                  <td className="px-3 py-3 text-gray-800 font-semibold border-b border-gray-100">{profile.name || '未登録'}</td>
                  <td className="px-3 py-3 border-b border-gray-100">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${isFlex ? 'bg-[#0C447C]/10 text-[#0C447C]' : 'bg-gray-100 text-gray-500'}`}>
                      {isFlex ? 'フレックス' : '固定'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-gray-700 border-b border-gray-100 whitespace-nowrap">{courseLabel(profile)}</td>
                  <td className="px-3 py-3 text-gray-700 border-b border-gray-100 whitespace-nowrap">
                    {contract?.type === 'fixed' ? shortDate(contract.start) : '-'}
                  </td>
                  <td className="px-3 py-3 border-b border-gray-100 whitespace-nowrap">
                    {!endKey ? (
                      <span className="text-gray-400">{isFlex ? 'チケット未購入' : '未予約'}</span>
                    ) : ended ? (
                      <span className="text-gray-400">{shortDate(endKey)}で終了<span className="ml-1 text-[11px] text-red-500 font-bold">継続手続きなし</span></span>
                    ) : (
                      <span className="text-[#A32D2D] font-bold">{shortDate(endKey)}{isFlex ? ' 期限' : ''}</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-gray-700 border-b border-gray-100 whitespace-nowrap">
                    {remaining === null || remaining === undefined ? '-' : `${remaining}回`}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function RewardTab({ coachId }) {
  const [reviews, setReviews] = useState([])
  const [nameMap, setNameMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  useEffect(() => {
    if (!coachId) return

    const load = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('reviews')
        .select('id, student_id, lesson_date, created_at, is_absent, duration_min')
        .eq('coach_id', coachId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[reward] fetch reviews failed:', error)
        setReviews([])
        setLoading(false)
        return
      }

      const rows = data || []
      setReviews(rows)

      const studentIds = [...new Set(rows.map((r) => r.student_id).filter(Boolean))]
      if (studentIds.length > 0) {
        const { data: profileRows } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', studentIds)
        setNameMap(Object.fromEntries((profileRows || []).map((p) => [p.id, p.name || '未登録'])))
      }

      setLoading(false)
    }

    load()
  }, [coachId])

  const filteredReviews = reviews.filter(r => {
    const dateStr = r.lesson_date || r.created_at?.slice(0, 10)
    return dateStr && dateStr.startsWith(selectedMonth)
  })

  const absentCount = filteredReviews.filter(r => r.is_absent).length
  const normalCount = filteredReviews.filter(r => !r.is_absent).length
  // 通常レッスンはレッスン長に応じて算出（10分=¥500 / 20分=¥1,000）、欠席は一律¥200。
  const normalReward = filteredReviews
    .filter(r => !r.is_absent)
    .reduce((sum, r) => sum + rewardForReview(r), 0)
  const absentReward = absentCount * REWARD_ABSENT
  const reward = normalReward + absentReward

  const monthOptions = []
  const now = new Date()
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = `${d.getFullYear()}年${d.getMonth() + 1}月`
    monthOptions.push({ val, label })
  }

  if (loading) return <p className="text-sm text-gray-400">読み込み中...</p>

  return (
    <div className="max-w-2xl space-y-5">
      <div className="rounded-2xl bg-[#FFF8E1] border border-[#FFE082] p-4">
        <p className="text-sm font-bold text-[#F57F17] mb-1">報酬はレビューの記録から計算されます</p>
        <p className="text-xs text-gray-700 leading-relaxed">
          レッスンを行っても、レビューを入力しなければ報酬は加算されません。レッスンが終わったら忘れずに入力してください。欠席だった場合も、欠席として記録をお願いします。
        </p>
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm font-semibold text-gray-600">対象月：</label>
        <select
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#A32D2D]/40"
        >
          {monthOptions.map(o => (
            <option key={o.val} value={o.val}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">通常レッスン</p>
          <div className="flex items-end gap-1">
            <span className="text-3xl font-extrabold text-[#0C447C]">{normalCount}</span>
            <span className="text-sm text-gray-400 mb-1">回</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">小計 ¥{normalReward.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">欠席処理</p>
          <div className="flex items-end gap-1">
            <span className="text-3xl font-extrabold text-orange-500">{absentCount}</span>
            <span className="text-sm text-gray-400 mb-1">回</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">× ¥{REWARD_ABSENT}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 col-span-2 sm:col-span-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">報酬合計</p>
          <div className="flex items-end gap-1">
            <span className="text-3xl font-extrabold text-[#A32D2D]">¥{reward.toLocaleString()}</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            通常 ¥{normalReward.toLocaleString()} + 欠席 ¥{absentReward.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <p className="text-sm font-bold text-gray-600">レッスン明細</p>
        </div>
        {filteredReviews.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-gray-400 text-sm">この月のレッスン記録はありません</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredReviews.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-5 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-800">{nameMap[r.student_id] || '未登録'}</p>
                    {r.is_absent && (
                      <span className="text-[11px] bg-orange-50 text-orange-600 border border-orange-200 font-bold px-2 py-0.5 rounded-full">欠席</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">
                    {r.lesson_date || r.created_at?.slice(0, 10)}
                    {!r.is_absent && <span className="ml-1">・{r.duration_min || 10}分</span>}
                  </p>
                </div>
                <span className={`text-sm font-bold ${r.is_absent ? 'text-orange-500' : 'text-[#A32D2D]'}`}>
                  ¥{rewardForReview(r).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function BookingsList({ coachId, onPendingCountChange }) {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState(null)

  const DAYS = ['日', '月', '火', '水', '木', '金', '土']

  useEffect(() => {
    if (!coachId) return
    supabase.from('lesson_bookings').select('*').eq('coach_id', coachId).order('created_at', { ascending: false }).then(({ data }) => {
      setBookings(data || [])
      setLoading(false)
    })
  }, [coachId])

  const handleStatus = async (id, status) => {
    setProcessingId(id)
    await supabase.from('lesson_bookings').update({ status }).eq('id', id)
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b))
    if (status !== 'pending') {
      onPendingCountChange?.(prev => Math.max(0, prev - 1))
    }
    setProcessingId(null)
  }

  if (loading) return <p className="text-sm text-gray-400">読み込み中...</p>
  if (bookings.length === 0) return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
      <p className="text-2xl mb-3">📭</p>
      <p className="text-gray-400 text-sm">予約申請はありません</p>
    </div>
  )

  return (
    <div className="space-y-3">
      {bookings.map(b => (
        <div key={b.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${b.status === 'pending' ? 'bg-yellow-50 text-yellow-600 border border-yellow-200' : b.status === 'approved' ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-red-50 text-red-400 border border-red-200'}`}>
                  {b.status === 'pending' ? '申請中' : b.status === 'approved' ? '承認済' : '拒否'}
                </span>
                <span className="text-xs text-gray-400">{new Date(b.created_at).toLocaleDateString('ja-JP')}</span>
              </div>
              {b.booking_type === 'flex' ? (
                <p className="text-sm font-bold text-gray-800">{b.booking_date}　{b.hour}:{String(b.minute).padStart(2,'0')} （{b.duration_min}分）<span className="ml-1 text-[11px] bg-[#0C447C]/10 text-[#0C447C] font-bold px-2 py-0.5 rounded-full">フレックス</span></p>
              ) : (
                <p className="text-sm font-bold text-gray-800">{DAYS[b.day_of_week]}曜日 {b.hour}:{String(b.minute).padStart(2,'0')} （{b.duration_min}分）</p>
              )}
              {b.booking_type !== 'flex' && b.start_date && (
                <p className="text-xs text-[#0C447C] mt-0.5">開始日：{b.start_date}</p>
              )}
              <p className="text-xs text-gray-500 mt-0.5">LINE / {b.contact}</p>
            </div>
            {b.status === 'pending' && (
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => handleStatus(b.id, 'approved')} disabled={processingId === b.id} className="rounded-xl bg-[#0C447C] px-3 py-1.5 text-white text-xs font-bold hover:opacity-90 transition disabled:opacity-50">承認</button>
                <button onClick={() => handleStatus(b.id, 'rejected')} disabled={processingId === b.id} className="rounded-xl bg-gray-200 px-3 py-1.5 text-gray-600 text-xs font-bold hover:opacity-90 transition disabled:opacity-50">拒否</button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function ReviewModal({ session, onClose, onSave }) {
  const [text, setText] = useState('')
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h3 className="font-bold text-[#0C447C] mb-1">{session.member} さんのレビュー</h3>
        <p className="text-xs text-gray-400 mb-4">{session.time} ／ {session.material}</p>
        <textarea rows={5} value={text} onChange={e => setText(e.target.value)} placeholder="今日の練習の様子、次回への申し送りなど" className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#A32D2D]/40 resize-none" />
        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm text-gray-500 hover:bg-gray-50 transition">キャンセル</button>
          <button onClick={() => onSave(text)} className="flex-1 rounded-xl bg-[#A32D2D] py-2.5 text-sm text-white font-semibold hover:opacity-90 transition">保存する</button>
        </div>
      </div>
    </div>
  )
}

function TodaySchedule({ schedule, onReview }) {
  const today = new Date()
  const dateStr = `${today.getFullYear()}年${today.getMonth()+1}月${today.getDate()}日（${'日月火水木金土'[today.getDay()]}）`
  if (schedule.length === 0) return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
      <p className="text-3xl mb-3">☀️</p>
      <p className="text-gray-400 text-sm">本日の練習はありません</p>
    </div>
  )
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">{dateStr}</p>
      {schedule.map(s => (
        <div key={s.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3 bg-[#0C447C]/5 border-b border-gray-100">
            <span className="text-xl font-extrabold text-[#0C447C] tracking-tight">{s.time}</span>
            <span className="font-semibold text-gray-800">{s.member}</span>
            {s.reviewed && <span className="ml-auto text-[11px] bg-green-50 text-green-600 border border-green-200 rounded-full px-2 py-0.5 font-semibold">レビュー済</span>}
          </div>
          <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">通話方法</p>
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-green-400"></span>
                <span className="text-gray-800 font-medium">LINE</span>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">連絡先</p>
              <p className="text-gray-800 font-medium break-all">{s.contact}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">使用教材</p>
              <p className="text-gray-800">{s.material}</p>
            </div>
            {s.note && (
              <div className="sm:col-span-2">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">備考</p>
                <p className="text-gray-600 bg-yellow-50 rounded-lg px-3 py-2 text-sm border border-yellow-100">{s.note}</p>
              </div>
            )}
          </div>
          <div className="px-5 pb-4">
            <button onClick={() => onReview(s)} className={`w-full sm:w-auto rounded-xl px-5 py-2 text-sm font-semibold transition ${s.reviewed ? 'bg-gray-100 text-gray-400 cursor-default' : 'bg-[#A32D2D] text-white hover:opacity-90'}`} disabled={s.reviewed}>
              {s.reviewed ? 'レビュー入力済み' : 'レビューを入力する'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function WeeklySchedule({ coachId }) {
  const today = new Date()
  const [viewMonth, setViewMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState(() => new Date(today))
  const [bookings, setBookings] = useState([])
  const [makeups, setMakeups] = useState([])
  const [profiles, setProfiles] = useState({})
  const [reviewMap, setReviewMap] = useState({})
  const [contractMap, setContractMap] = useState({})
  const [contractLoaded, setContractLoaded] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!coachId) return
    fetchContractMap(coachId).then((map) => {
      setContractMap(map)
      setContractLoaded(true)
    })
  }, [coachId])

  useEffect(() => {
    if (!coachId) return

    const loadBookings = async () => {
      setLoading(true)
      const { data: bookingRows, error } = await supabase
        .from('lesson_bookings')
        .select('id, student_id, coach_id, day_of_week, hour, minute, duration_min, method, contact, status, start_date, booking_type, booking_date')
        .eq('coach_id', coachId)
        .eq('status', 'approved')
        .order('day_of_week', { ascending: true })
        .order('hour', { ascending: true })
        .order('minute', { ascending: true })

      if (error) {
        console.error('[coach-weekly] fetch bookings failed:', error)
        setBookings([])
        setMakeups([])
        setProfiles({})
        setReviewMap({})
        setLoading(false)
        return
      }

      // 確定済みの補講（confirmed_at がある approved の補講）を読み込む。
      const { data: makeupRows, error: makeupError } = await supabase
        .from('lesson_makeup_requests')
        .select('id, student_id, coach_id, booking_id, original_date, confirmed_at, status')
        .eq('coach_id', coachId)
        .eq('status', 'approved')
        .not('confirmed_at', 'is', null)

      if (makeupError) {
        console.error('[coach-weekly] fetch makeups failed:', makeupError)
      }
      const confirmedMakeups = makeupRows || []

      // プロフィールは、予約と補講の両方に登場する生徒をまとめて取得する。
      const studentIds = [...new Set([
        ...(bookingRows || []).map((booking) => booking.student_id),
        ...confirmedMakeups.map((makeup) => makeup.student_id),
      ].filter(Boolean))]
      let profileMap = {}
      if (studentIds.length > 0) {
        const { data: profileRows } = await supabase
          .from('profiles')
          .select('id, name, line_id, study_course')
          .in('id', studentIds)
        profileMap = Object.fromEntries((profileRows || []).map((profile) => [profile.id, {
          name: profile.name || '未登録',
          line_id: profile.line_id || '',
          study_course: profile.study_course || '',
        }]))
      }

      let reviewState = {}
      if ((bookingRows?.length || 0) + confirmedMakeups.length > 0) {
        const { data: reviewRows } = await supabase
          .from('reviews')
          .select('id, booking_id, student_id, coach_id, lesson_date, lesson_hour, lesson_minute')
          .eq('coach_id', coachId)
        reviewState = Object.fromEntries(
          (reviewRows || [])
            .filter((review) => review.student_id && review.lesson_date)
            .map((review) => [reviewKey(review.student_id, review.lesson_date, review.lesson_hour, review.lesson_minute), true])
        )
      }

      setBookings(bookingRows || [])
      setMakeups(confirmedMakeups)
      setProfiles(profileMap)
      setReviewMap(reviewState)
      setLoading(false)
    }

    loadBookings()
  }, [coachId])

  const sameDate = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

  const year = viewMonth.getFullYear()
  const month = viewMonth.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDay; i += 1) cells.push(null)
  for (let i = 1; i <= daysInMonth; i += 1) cells.push(new Date(year, month, i))
  while (cells.length % 7 !== 0) cells.push(null)

  const selectedDateKey = toDateKey(selectedDate)
  const selectedDow = selectedDate.getDay()

  // 補講に振り替えられた「元の授業日」は、その日には表示しない（B案）。
  // ある予約(booking_id)が、選択日に紐づく元授業日として補講に振り替えられているかを判定する。
  const isReplacedByMakeup = (booking) => {
    return makeups.some((makeup) =>
      makeup.student_id === booking.student_id &&
      makeup.original_date === selectedDateKey
    )
  }

  // 通常予約の行（固定は曜日一致・フレックスは日付一致。補講に振り替えられた元授業日ぶんは除外）。
  // 固定予約のうち、契約外（契約終了後・5週目）の日は表示しない。
  const bookingRowsForDay = bookings
    .filter((booking) => bookingShowsOnDate(booking, selectedDateKey, selectedDow))
    .filter((booking) => !isReplacedByMakeup(booking))
    .filter((booking) => !isOutsideFixedContract(booking, contractMap, selectedDateKey))
    .map((booking) => ({
      kind: 'booking',
      isFlex: booking.booking_type === 'flex',
      key: `booking-${booking.id}`,
      sortMinutes: booking.hour * 60 + booking.minute,
      hour: booking.hour,
      minute: booking.minute,
      durationMin: booking.duration_min,
      studentId: booking.student_id,
      bookingId: booking.id,
      dateKey: selectedDateKey,
    }))

  // 補講の行（confirmed_at の日付が選択日と一致するもの）。
  const makeupRowsForDay = makeups
    .filter((makeup) => makeupDateKey(makeup.confirmed_at) === selectedDateKey)
    .map((makeup) => {
      const { hour, minute } = makeupHourMinute(makeup.confirmed_at)
      return {
        kind: 'makeup',
        key: `makeup-${makeup.id}`,
        sortMinutes: hour * 60 + minute,
        hour,
        minute,
        durationMin: 10,
        studentId: makeup.student_id,
        bookingId: makeup.booking_id,
        dateKey: selectedDateKey,
      }
    })

  const selectedRows = [...bookingRowsForDay, ...makeupRowsForDay].sort((a, b) => a.sortMinutes - b.sortMinutes)

  const formatTime = (hour, minute, durationMin) => {
    const start = new Date(2000, 0, 1, hour, minute)
    const end = new Date(start.getTime() + (durationMin || 10) * 60000)
    return `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}-${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`
  }

  const isLoading = loading || !contractLoaded

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,8fr)] lg:items-start">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-2.5 sm:p-3 lg:max-w-xs lg:justify-self-start">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => setViewMonth(new Date(year, month - 1, 1))} className="rounded-full p-1 text-[#0C447C] hover:bg-[#0C447C]/5 transition">◀</button>
          <h2 className="text-xs sm:text-sm font-bold text-[#0C447C]">{year}年{month + 1}月</h2>
          <button onClick={() => setViewMonth(new Date(year, month + 1, 1))} className="rounded-full p-1 text-[#0C447C] hover:bg-[#0C447C]/5 transition">▶</button>
        </div>
        <div className="grid grid-cols-7 text-center text-[9px] sm:text-[10px] font-semibold text-gray-400 mb-1.5">
          {DAYS.map((day) => <div key={day}>{day}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((date, index) => {
            if (!date) return <div key={`empty-${index}`} className="h-7 sm:h-8" />
            const isToday = sameDate(date, today)
            const isSelected = sameDate(date, selectedDate)
            return (
              <button
                key={date.toISOString()}
                onClick={() => {
                  setSelectedDate(date)
                  setViewMonth(new Date(date.getFullYear(), date.getMonth(), 1))
                }}
                className={`h-7 sm:h-8 rounded-md text-[10px] sm:text-xs font-medium transition ${isSelected ? 'bg-[#0C447C] text-white shadow-sm' : 'text-gray-700 hover:bg-[#0C447C]/5'} ${isToday && !isSelected ? 'underline decoration-[#A32D2D] decoration-2 underline-offset-2' : ''}`}
              >
                {date.getDate()}
              </button>
            )
          })}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-3 md:p-4 lg:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div>
            <h2 className="text-lg font-bold text-[#0C447C]">{selectedDate.getFullYear()}年 {selectedDate.getMonth() + 1}月{selectedDate.getDate()}日</h2>
            <p className="text-sm text-gray-400">{DAYS[selectedDate.getDay()]}曜日</p>
          </div>
          <div className="text-sm font-semibold text-[#A32D2D]">{isLoading ? '' : `${selectedRows.length}講義`}</div>
        </div>

        {isLoading ? (
          <p className="text-sm text-gray-400">読み込み中...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[600px] w-full text-sm border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="bg-gray-100 text-gray-600 font-semibold px-3 py-2 text-left border-b border-gray-200">時間</th>
                  <th className="bg-gray-100 text-gray-600 font-semibold px-3 py-2 text-left border-b border-gray-200">名前</th>
                  <th className="bg-gray-100 text-gray-600 font-semibold px-3 py-2 text-left border-b border-gray-200">レビュー</th>
                  <th className="bg-gray-100 text-gray-600 font-semibold px-3 py-2 text-left border-b border-gray-200">希望コース</th>
                  <th className="bg-gray-100 text-gray-600 font-semibold px-3 py-2 text-left border-b border-gray-200">連絡先</th>
                  <th className="bg-gray-100 text-gray-600 font-semibold px-3 py-2 text-left border-b border-gray-200">種別</th>
                  <th className="bg-gray-100 text-gray-600 font-semibold px-3 py-2 text-left border-b border-gray-200">備考</th>
                </tr>
              </thead>
              <tbody>
                {selectedRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-sm text-gray-400">この日の講義はありません</td>
                  </tr>
                ) : selectedRows.map((row) => {
                  const profile = profiles[row.studentId] || { name: '未登録', line_id: '', study_course: '' }
                  const hasReview = Boolean(reviewMap[reviewKey(row.studentId, row.dateKey, row.hour, row.minute)])
                  const reviewHref = hasReview
                    ? `/review/coach-view?student=${row.studentId}&date=${row.dateKey}&hour=${row.hour}&minute=${row.minute}`
                    : `/review/input?student=${row.studentId}&date=${row.dateKey}&hour=${row.hour}&minute=${row.minute}${row.bookingId ? `&booking=${row.bookingId}` : ''}`
                  return (
                    <tr key={row.key} className="odd:bg-white even:bg-[#F6FAFF] hover:bg-[#F0F7FF] transition">
                      <td className="px-3 py-3 text-gray-700 whitespace-nowrap border-b border-gray-100">{formatTime(row.hour, row.minute, row.durationMin)}</td>
                      <td className="px-3 py-3 text-gray-700 border-b border-gray-100">{profile.name}</td>
                      <td className="px-3 py-3 border-b border-gray-100">
                        {hasReview ? (
                          <Link href={reviewHref} className="text-[#0C447C] font-semibold hover:underline">見る</Link>
                        ) : (
                          <Link href={reviewHref} className="text-[#A32D2D] font-semibold hover:underline">✏️</Link>
                        )}
                      </td>
                      <td className="px-3 py-3 text-gray-700 border-b border-gray-100">{profile.study_course || <span className="text-gray-400">未選択</span>}</td>
                      <td className="px-3 py-3 text-gray-700 border-b border-gray-100 break-all">{formatProfileContact(profile)}</td>
                      <td className="px-3 py-3 border-b border-gray-100">
                        {row.kind === 'makeup' && (
                          <span className="text-[11px] bg-[#A32D2D]/10 text-[#A32D2D] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">補講</span>
                        )}
                        {row.kind === 'booking' && row.isFlex && (
                          <span className="text-[11px] bg-[#0C447C]/10 text-[#0C447C] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">フレックス</span>
                        )}
                        {row.kind === 'booking' && !row.isFlex && (
                          <span className="text-[11px] text-gray-400 whitespace-nowrap">固定</span>
                        )}
                      </td>
                      <td className="px-3 py-3 border-b border-gray-100">
                        <ContractNote contract={contractMap[row.studentId]?.contract} dateKey={row.dateKey} isFlex={row.isFlex} isMakeup={row.kind === 'makeup'} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// 担当に設定されているが、まだ有効な予約が1件もない生徒を「予約待ち」として表示する。
// 本日/週間スケジュールは lesson_bookings 起点のため、予約ゼロの担当生徒はどこにも出てこない。
// その穴を塞ぐための欄（該当者がいないときは何も表示しない）。
function PendingStudentsNotice({ coachId }) {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!coachId) return

    const load = async () => {
      setLoading(true)

      // 担当生徒（profiles.coach_id = 自分）を全員取得する。
      const { data: assigned, error } = await supabase
        .from('profiles')
        .select('id, name, furigana, line_id, plan_type, study_course')
        .eq('coach_id', coachId)

      if (error) {
        console.error('[pending-students] fetch profiles failed:', error)
        setStudents([])
        setLoading(false)
        return
      }

      const assignedRows = assigned || []
      if (assignedRows.length === 0) {
        setStudents([])
        setLoading(false)
        return
      }

      // 自分の担当予約のうち、pending / approved（＝有効な予約）を持つ生徒IDを集める。
      const { data: bookingRows } = await supabase
        .from('lesson_bookings')
        .select('student_id, status')
        .eq('coach_id', coachId)
        .in('status', ['pending', 'approved'])

      const bookedIds = new Set((bookingRows || []).map((b) => b.student_id))

      // 有効な予約が1件もない担当生徒＝「予約待ち」。
      const pending = assignedRows.filter((p) => !bookedIds.has(p.id))

      // フレックス生徒は、有効なチケット（残あり・期限内）があればお支払い済み。
      const flexIds = pending.filter((p) => p.plan_type === 'flex').map((p) => p.id)
      let ticketMap = {}
      if (flexIds.length > 0) {
        const todayKey = toDateKey(new Date())
        const { data: ticketRows, error: ticketError } = await supabase
          .from('ticket_balance')
          .select('student_id, remaining, expires_at')
          .in('student_id', flexIds)
        if (ticketError) console.error('[pending-students] fetch tickets failed:', ticketError)
        ;(ticketRows || [])
          .filter((t) => (t.remaining || 0) > 0 && (!t.expires_at || t.expires_at >= todayKey))
          .forEach((t) => {
            const prev = ticketMap[t.student_id]
            if (!prev || (t.expires_at || '') > (prev.expires_at || '')) ticketMap[t.student_id] = t
          })
      }

      setStudents(pending.map((p) => ({ ...p, ticket: ticketMap[p.id] || null })))
      setLoading(false)
    }

    load()
  }, [coachId])

  if (loading || students.length === 0) return null

  return (
    <div className="mb-4 rounded-2xl bg-[#FFF8E1] border border-[#FFE082] p-4">
      <p className="text-sm font-bold text-[#F57F17] mb-1">予約待ちの担当生徒がいます（{students.length}名）</p>
      <p className="text-xs text-gray-600 leading-relaxed mb-3">
        担当に設定されていますが、まだレッスンの予約が入っていない生徒です。まずはLINEでの友だち追加・ごあいさつをお願いします。生徒が予約すると、本日／週間スケジュールに表示されます。
      </p>
      <p className="text-[11px] text-gray-500 leading-relaxed mb-3">※ ID検索で生徒が見つからない場合は、けーこまでご連絡ください。</p>
      <div className="space-y-2">
        {students.map((s) => (
          <div key={s.id} className="bg-white rounded-xl border border-[#FFE082]/60 px-4 py-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-gray-800">{s.name || '未登録'}</span>
              {s.furigana && <span className="text-xs text-gray-400">{s.furigana}</span>}
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${s.plan_type === 'flex' ? 'bg-[#0C447C]/10 text-[#0C447C]' : 'bg-gray-100 text-gray-500'}`}>
                {s.plan_type === 'flex' ? 'フレックス' : '固定'}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
              <span>連絡先：{s.line_id ? `LINE(${s.line_id})` : 'LINE'}</span>
              {s.study_course && <span>希望コース：{s.study_course}</span>}
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {s.plan_type === 'flex' && s.ticket ? (
                <span className="text-[11px] bg-green-50 text-green-700 border border-green-200 font-bold px-2 py-0.5 rounded-full">
                  お支払い済み・予約待ち（残{s.ticket.remaining}回・{shortDate(s.ticket.expires_at)}期限）
                </span>
              ) : s.plan_type === 'flex' ? (
                <span className="text-[11px] bg-gray-100 text-gray-500 font-bold px-2 py-0.5 rounded-full">お支払い前（チケット未購入）</span>
              ) : (
                <span className="text-[11px] bg-gray-100 text-gray-500 font-bold px-2 py-0.5 rounded-full">お支払い・予約前</span>
              )}
              {!s.line_id && (
                <span className="text-[11px] bg-red-50 text-red-600 border border-red-200 font-bold px-2 py-0.5 rounded-full">
                  LINE ID未登録（予約時に生徒さんからLINE追加されます）
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TodayScheduleReal({ coachId }) {
  const today = new Date()
  const [bookings, setBookings] = useState([])
  const [makeups, setMakeups] = useState([])
  const [profiles, setProfiles] = useState({})
  const [reviewMap, setReviewMap] = useState({})
  const [contractMap, setContractMap] = useState({})
  const [contractLoaded, setContractLoaded] = useState(false)
  const [loading, setLoading] = useState(true)

  const todayKey = toDateKey(today)

  useEffect(() => {
    if (!coachId) return
    fetchContractMap(coachId).then((map) => {
      setContractMap(map)
      setContractLoaded(true)
    })
  }, [coachId])

  useEffect(() => {
    if (!coachId) return

    const loadBookings = async () => {
      setLoading(true)
      const { data: bookingRows, error } = await supabase
        .from('lesson_bookings')
        .select('id, student_id, coach_id, day_of_week, hour, minute, duration_min, method, contact, status, start_date, booking_type, booking_date')
        .eq('coach_id', coachId)
        .eq('status', 'approved')
        .order('hour', { ascending: true })
        .order('minute', { ascending: true })

      if (error) {
        console.error('[coach-today] fetch bookings failed:', error)
        setBookings([])
        setMakeups([])
        setProfiles({})
        setReviewMap({})
        setLoading(false)
        return
      }

      // 今日ぶんの予約だけに絞る。
      // ・フレックス予約(booking_type='flex')は、booking_dateが今日と一致するものだけ表示。
      // ・固定予約は、今日の曜日と一致し、かつ開始日(start_date)が今日以前のものだけ表示。
      const todayDow = new Date().getDay()
      const visibleRows = (bookingRows || []).filter((booking) => bookingShowsOnDate(booking, todayKey, todayDow))

      // 確定済みの補講のうち、確定日(confirmed_at)が今日のものを読み込む。
      const { data: makeupRows, error: makeupError } = await supabase
        .from('lesson_makeup_requests')
        .select('id, student_id, coach_id, booking_id, original_date, confirmed_at, status')
        .eq('coach_id', coachId)
        .eq('status', 'approved')
        .not('confirmed_at', 'is', null)

      if (makeupError) {
        console.error('[coach-today] fetch makeups failed:', makeupError)
      }
      const todaysMakeups = (makeupRows || []).filter((makeup) => makeupDateKey(makeup.confirmed_at) === todayKey)

      // 補講に振り替えられた「元授業日 = 今日」の予約は、今日には表示しない（B案）。
      const filteredBookings = visibleRows.filter((booking) => {
        return !(makeupRows || []).some((makeup) =>
          makeup.student_id === booking.student_id && makeup.original_date === todayKey
        )
      })

      const studentIds = [...new Set([
        ...filteredBookings.map((booking) => booking.student_id),
        ...todaysMakeups.map((makeup) => makeup.student_id),
      ].filter(Boolean))]
      let profileMap = {}
      if (studentIds.length > 0) {
        const { data: profileRows } = await supabase
          .from('profiles')
          .select('id, name, line_id, study_course')
          .in('id', studentIds)
        profileMap = Object.fromEntries((profileRows || []).map((profile) => [profile.id, {
          name: profile.name || '未登録',
          line_id: profile.line_id || '',
          study_course: profile.study_course || '',
        }]))
      }

      let reviewState = {}
      if (filteredBookings.length + todaysMakeups.length > 0) {
        const { data: reviewRows } = await supabase
          .from('reviews')
          .select('id, student_id, coach_id, lesson_date, lesson_hour, lesson_minute')
          .eq('coach_id', coachId)
        reviewState = Object.fromEntries(
          (reviewRows || [])
            .filter((review) => review.student_id && review.lesson_date)
            .map((review) => [reviewKey(review.student_id, review.lesson_date, review.lesson_hour, review.lesson_minute), true])
        )
      }

      // 通常予約はisFlex情報を付けて保持する。
      setBookings(filteredBookings.map((booking) => ({ ...booking, isFlex: booking.booking_type === 'flex' })))
      setMakeups(todaysMakeups)
      setProfiles(profileMap)
      setReviewMap(reviewState)
      setLoading(false)
    }

    loadBookings()
  }, [coachId])

  const formatTime = (hour, minute, durationMin) => {
    const start = new Date(2000, 0, 1, hour, minute)
    const end = new Date(start.getTime() + (durationMin || 10) * 60000)
    return `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}-${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`
  }

  // 通常予約と補講を1つの配列にまとめ、時刻順に並べる。
  // 固定予約のうち、今日が契約外（契約終了後・5週目）のものは表示しない。
  const bookingRowsForToday = bookings
    .filter((booking) => !isOutsideFixedContract(booking, contractMap, todayKey))
    .map((booking) => ({
      kind: 'booking',
      isFlex: booking.isFlex,
      key: `booking-${booking.id}`,
      sortMinutes: booking.hour * 60 + booking.minute,
      hour: booking.hour,
      minute: booking.minute,
      durationMin: booking.duration_min,
      studentId: booking.student_id,
      bookingId: booking.id,
    }))
  const makeupRowsForToday = makeups.map((makeup) => {
    const { hour, minute } = makeupHourMinute(makeup.confirmed_at)
    return {
      kind: 'makeup',
      key: `makeup-${makeup.id}`,
      sortMinutes: hour * 60 + minute,
      hour,
      minute,
      durationMin: 10,
      studentId: makeup.student_id,
      bookingId: makeup.booking_id,
    }
  })
  const todayRows = [...bookingRowsForToday, ...makeupRowsForToday].sort((a, b) => a.sortMinutes - b.sortMinutes)

  const isLoading = loading || !contractLoaded

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-3 md:p-4 lg:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div>
          <h2 className="text-lg font-bold text-[#0C447C]">{today.getFullYear()}年 {today.getMonth() + 1}月{today.getDate()}日</h2>
          <p className="text-sm text-gray-400">{DAYS[today.getDay()]}曜日</p>
        </div>
        <div className="text-sm font-semibold text-[#A32D2D]">{isLoading ? '' : `${todayRows.length}講義`}</div>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-400">読み込み中...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[600px] w-full text-sm border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="bg-gray-100 text-gray-600 font-semibold px-3 py-2 text-left border-b border-gray-200">時間</th>
                <th className="bg-gray-100 text-gray-600 font-semibold px-3 py-2 text-left border-b border-gray-200">名前</th>
                <th className="bg-gray-100 text-gray-600 font-semibold px-3 py-2 text-left border-b border-gray-200">レビュー</th>
                <th className="bg-gray-100 text-gray-600 font-semibold px-3 py-2 text-left border-b border-gray-200">希望コース</th>
                <th className="bg-gray-100 text-gray-600 font-semibold px-3 py-2 text-left border-b border-gray-200">連絡先</th>
                <th className="bg-gray-100 text-gray-600 font-semibold px-3 py-2 text-left border-b border-gray-200">種別</th>
                <th className="bg-gray-100 text-gray-600 font-semibold px-3 py-2 text-left border-b border-gray-200">備考</th>
              </tr>
            </thead>
            <tbody>
              {todayRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-sm text-gray-400">本日の講義はありません</td>
                </tr>
              ) : todayRows.map((row) => {
                const profile = profiles[row.studentId] || { name: '未登録', line_id: '', study_course: '' }
                const hasReview = Boolean(reviewMap[reviewKey(row.studentId, todayKey, row.hour, row.minute)])
                const reviewHref = hasReview
                  ? `/review/coach-view?student=${row.studentId}&date=${todayKey}&hour=${row.hour}&minute=${row.minute}`
                  : `/review/input?student=${row.studentId}&date=${todayKey}&hour=${row.hour}&minute=${row.minute}${row.bookingId ? `&booking=${row.bookingId}` : ''}`
                return (
                  <tr key={row.key} className="odd:bg-white even:bg-[#F6FAFF] hover:bg-[#F0F7FF] transition">
                    <td className="px-3 py-3 text-gray-700 whitespace-nowrap border-b border-gray-100">{formatTime(row.hour, row.minute, row.durationMin)}</td>
                    <td className="px-3 py-3 text-gray-700 border-b border-gray-100">{profile.name}</td>
                    <td className="px-3 py-3 border-b border-gray-100">
                      {hasReview ? (
                        <Link href={reviewHref} className="text-[#0C447C] font-semibold hover:underline">見る</Link>
                      ) : (
                        <Link href={reviewHref} className="text-[#A32D2D] font-semibold hover:underline">✏️</Link>
                      )}
                    </td>
                    <td className="px-3 py-3 text-gray-700 border-b border-gray-100">{profile.study_course || <span className="text-gray-400">未選択</span>}</td>
                    <td className="px-3 py-3 text-gray-700 border-b border-gray-100 break-all">{formatProfileContact(profile)}</td>
                    <td className="px-3 py-3 border-b border-gray-100">
                      {row.kind === 'makeup' && (
                        <span className="text-[11px] bg-[#A32D2D]/10 text-[#A32D2D] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">補講</span>
                      )}
                      {row.kind === 'booking' && row.isFlex && (
                        <span className="text-[11px] bg-[#0C447C]/10 text-[#0C447C] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">フレックス</span>
                      )}
                      {row.kind === 'booking' && !row.isFlex && (
                        <span className="text-[11px] text-gray-400 whitespace-nowrap">固定</span>
                      )}
                    </td>
                    <td className="px-3 py-3 border-b border-gray-100">
                      <ContractNote contract={contractMap[row.studentId]?.contract} dateKey={todayKey} isFlex={row.isFlex} isMakeup={row.kind === 'makeup'} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function AvailabilitySettings({ coachId }) {
  const [grid, setGrid] = useState(initGrid)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [dragging, setDragging] = useState(null)
  const scrollRef = useRef(null)
  const headerRef = useRef(null)

  useEffect(() => {
    if (!coachId) return
    supabase.from('coach_schedule').select('day_of_week, hour, minute, is_open').eq('coach_id', coachId).then(({ data }) => {
      if (data && data.length > 0) {
        setGrid(prev => {
          const next = { ...prev }
          data.forEach(({ day_of_week, hour, minute, is_open }) => { next[`${day_of_week}-${hour}-${minute}`] = is_open })
          return next
        })
      }
      setLoading(false)
    })
  }, [coachId])

  const handleScroll = () => {
    if (headerRef.current && scrollRef.current) {
      headerRef.current.scrollLeft = scrollRef.current.scrollLeft
    }
  }

  const toggle = useCallback((k) => { setGrid(prev => ({ ...prev, [k]: !prev[k] })); setSaved(false) }, [])

  const toggleCol = (di, checked) => {
    setGrid(prev => { const next = { ...prev }; SLOTS.forEach(({ h, m }) => { next[`${di}-${h}-${m}`] = checked }); return next })
    setSaved(false)
  }

  const selectAll = () => { setGrid(Object.fromEntries(Object.keys(initGrid()).map(k => [k, true]))); setSaved(false) }
  const clearAll = () => { setGrid(initGrid()); setSaved(false) }
  const selectWeekday = () => {
    setGrid(prev => { const next = { ...prev }; Object.keys(next).forEach(k => { const di = parseInt(k.split('-')[0]); next[k] = di >= 1 && di <= 5 }); return next })
    setSaved(false)
  }

  const handleMouseDown = (k) => { const newVal = !grid[k]; setDragging(newVal); setGrid(prev => ({ ...prev, [k]: newVal })); setSaved(false) }
  const handleMouseEnter = (k) => { if (dragging === null) return; setGrid(prev => ({ ...prev, [k]: dragging })) }
  const handleMouseUp = () => setDragging(null)

  const handleSave = async () => {
    if (!coachId) return
    setSaving(true)
    const rows = []
    DAYS.forEach((_, di) => SLOTS.forEach(({ h, m }) => rows.push({ coach_id: coachId, day_of_week: di, hour: h, minute: m, is_open: grid[`${di}-${h}-${m}`] || false, updated_at: new Date().toISOString() })))
    const { error } = await supabase.from('coach_schedule').upsert(rows, { onConflict: 'coach_id,day_of_week,hour,minute' })
    setSaving(false)
    if (!error) { setSaved(true); setTimeout(() => setSaved(false), 3000) }
  }

  const openCount = Object.values(grid).filter(Boolean).length
  if (loading) return <p className="text-sm text-gray-400">読み込み中...</p>

  const COL_W = 68
  const TIME_W = 52

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-6" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      <p className="text-sm text-gray-500 mb-4">受講できる時間帯をクリック（またはドラッグ）でオープンにしてください。</p>
      <div className="flex flex-wrap gap-2 items-center mb-4">
        <button onClick={selectAll} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition">全選択</button>
        <button onClick={clearAll} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition">全解除</button>
        <button onClick={selectWeekday} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition">平日のみ</button>
        <div className="flex-1" />
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-[#e85d4a]" />オープン</span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-gray-100 border border-gray-200" />クローズ</span>
        </div>
      </div>

      <div ref={headerRef} style={{ overflowX: 'hidden', minWidth: 0 }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: TIME_W + COL_W * 7 }}>
          <thead>
            <tr>
              <th style={{ width: TIME_W, background: '#f8f8f8', border: '0.5px solid #e8e8e8', fontSize: 11, padding: '4px 0' }} />
              {DAYS.map((d, di) => (
                <th key={di} style={{ background: '#f8f8f8', border: '0.5px solid #e8e8e8', fontSize: 12, fontWeight: 500, color: '#666', padding: '4px 0', textAlign: 'center', width: COL_W }}>
                  {d}<br /><input type="checkbox" style={{ marginTop: 2 }} onChange={e => toggleCol(di, e.target.checked)} />
                </th>
              ))}
            </tr>
          </thead>
        </table>
      </div>

      <div ref={scrollRef} onScroll={handleScroll} className="overflow-x-auto select-none" style={{ maxHeight: 400, overflowY: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: TIME_W + COL_W * 7 }}>
          <tbody>
            {SLOTS.map(({ h, m }) => (
              <tr key={`${h}-${m}`}>
                <td style={{ border: '0.5px solid #e8e8e8', background: '#f8f8f8', textAlign: 'center', fontSize: m === 0 ? 11 : 10, fontWeight: m === 0 ? 600 : 400, color: m === 0 ? '#555' : '#bbb', padding: '0 4px', whiteSpace: 'nowrap', width: TIME_W }}>
                  {m === 0 ? `${h}時` : `${h}:${String(m).padStart(2, '0')}`}
                </td>
                {DAYS.map((_, di) => {
                  const k = `${di}-${h}-${m}`
                  return (
                    <td key={di} onMouseDown={() => handleMouseDown(k)} onMouseEnter={() => handleMouseEnter(k)}
                      style={{ border: '0.5px solid #e8e8e8', height: 20, cursor: 'pointer', background: grid[k] ? '#e85d4a' : '#fff', transition: 'background 0.08s', userSelect: 'none', width: COL_W }} />
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-4 mt-5">
        <button onClick={handleSave} disabled={saving} className="rounded-xl bg-[#A32D2D] px-6 py-2.5 text-sm text-white font-semibold hover:opacity-90 transition disabled:opacity-50">
          {saving ? '保存中...' : '保存する'}
        </button>
        <span className="text-xs text-gray-400">{openCount}コマ選択中</span>
        {saved && <span className="text-sm text-green-600 font-medium">✅ 保存しました</span>}
      </div>
    </div>
  )
}

export default function CoachDashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [coachId, setCoachId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeMenu, setActiveMenu] = useState('today')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [pendingList, setPendingList] = useState([])
  const [approvalsNameMap, setApprovalsNameMap] = useState({})
  const [approvalsBadgeCount, setApprovalsBadgeCount] = useState(0)
  const [makeupBadgeCount, setMakeupBadgeCount] = useState(0)
  const [bookingBadgeCount, setBookingBadgeCount] = useState(0)
  const [pendingStudentBadgeCount, setPendingStudentBadgeCount] = useState(0)
  const [approvingId, setApprovingId] = useState(null)
  const [schedule, setSchedule] = useState(MOCK_SCHEDULE)
  const [reviewTarget, setReviewTarget] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      if (profile?.role !== 'coach') { router.push('/dashboard/student'); return }
      const { data: coach } = await supabase.from('coaches').select('id').eq('id', session.user.id).single()
      if (coach) setCoachId(coach.id)
      setUser(session.user)
      setLoading(false)
    })
  }, [])

  const fetchMakeupBadgeCount = async (coachId) => {
    if (!coachId) return
    const { data, error } = await supabase
      .from('lesson_makeup_requests')
      .select('id')
      .eq('coach_id', coachId)
      .eq('status', 'pending')

    if (error) {
      console.error('[coach] fetch makeup badge count failed:', error)
      return
    }
    setMakeupBadgeCount((data || []).length)
  }

  const fetchBookingBadgeCount = async (coachId) => {
    if (!coachId) return
    const { data, error } = await supabase
      .from('lesson_bookings')
      .select('id')
      .eq('coach_id', coachId)
      .eq('status', 'pending')

    if (error) {
      console.error('[coach] fetch booking badge count failed:', error)
      return
    }
    setBookingBadgeCount((data || []).length)
  }

  const fetchApprovalsBadgeCount = async () => {
    const { data, error } = await supabase
      .from('lesson_access')
      .select('id')
      .eq('status', 'pending')

    if (error) {
      console.error('[coach] fetch approvals badge count failed:', error)
      return
    }
    setApprovalsBadgeCount((data || []).length)
  }

  // 担当生徒のうち、有効な予約(pending/approved)が1件もない「予約待ち」の人数を数える。
  // PendingStudentsNotice と同じ判定ロジック。サイドバーの本日スケジュールにバッジ表示する。
  const fetchPendingStudentBadgeCount = async (coachId) => {
    if (!coachId) return

    const { data: assigned, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('coach_id', coachId)

    if (error) {
      console.error('[coach] fetch pending-student badge count failed:', error)
      return
    }

    const assignedRows = assigned || []
    if (assignedRows.length === 0) {
      setPendingStudentBadgeCount(0)
      return
    }

    const { data: bookingRows } = await supabase
      .from('lesson_bookings')
      .select('student_id, status')
      .eq('coach_id', coachId)
      .in('status', ['pending', 'approved'])

    const bookedIds = new Set((bookingRows || []).map((b) => b.student_id))
    const pendingCount = assignedRows.filter((p) => !bookedIds.has(p.id)).length
    setPendingStudentBadgeCount(pendingCount)
  }

  useEffect(() => {
    if (!coachId) return
    fetchMakeupBadgeCount(coachId)
    fetchBookingBadgeCount(coachId)
    fetchApprovalsBadgeCount()
    fetchPendingStudentBadgeCount(coachId)
  }, [coachId])

  // 本日のスケジュールを開くたびに、予約待ちバッジを取り直す
  // （その画面のカードと数を一致させ、生徒が予約したら消えるようにする）。
  useEffect(() => {
    if (activeMenu !== 'today' || !coachId) return
    fetchPendingStudentBadgeCount(coachId)
  }, [activeMenu, coachId])

  useEffect(() => {
    if (activeMenu !== 'makeup' || !coachId) return
    fetchMakeupBadgeCount(coachId)
  }, [activeMenu, coachId])

  useEffect(() => {
    if (activeMenu !== 'bookings' || !coachId) return
    fetchBookingBadgeCount(coachId)
  }, [activeMenu, coachId])

  const fetchPending = async () => {
    const { data, error } = await supabase.from('lesson_access').select('id, student_id, course_id, lesson_number, status, requested_at').eq('status', 'pending').order('requested_at', { ascending: true })
    if (error) console.error('[CoachApproval] Fetch error:', error)
    const rows = data || []
    setPendingList(rows)
    setApprovalsBadgeCount(rows.length)

    const studentIds = [...new Set(rows.map(r => r.student_id).filter(Boolean))]
    if (studentIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, name').in('id', studentIds)
      const map = Object.fromEntries((profiles || []).map(p => [p.id, p.name || '未登録']))
      setApprovalsNameMap(map)
    } else {
      setApprovalsNameMap({})
    }
  }

  useEffect(() => { if (activeMenu === 'approvals') fetchPending() }, [activeMenu])

  const handleApprove = async (id) => {
    setApprovingId(id)
    await supabase.from('lesson_access').update({ status: 'approved' }).eq('id', id)
    setPendingList(prev => prev.filter(r => r.id !== id))
    setApprovalsBadgeCount(prev => Math.max(0, prev - 1))
    setApprovingId(null)
  }

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/') }

  const handleReviewSave = () => {
    setSchedule(prev => prev.map(s => s.id === reviewTarget.id ? { ...s, reviewed: true } : s))
    setReviewTarget(null)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-gray-400 text-sm">読み込み中...</p></div>

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'Noto Sans KR', sans-serif" }}>
      <Head><title>コーチページ | 電話韓国語 チグム</title></Head>
      {reviewTarget && <ReviewModal session={reviewTarget} onClose={() => setReviewTarget(null)} onSave={handleReviewSave} />}
      <header className="bg-white border-b border-gray-100 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button className="md:hidden p-2 rounded-lg hover:bg-gray-100" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <span className="block w-5 h-0.5 bg-gray-600 mb-1"></span>
            <span className="block w-5 h-0.5 bg-gray-600 mb-1"></span>
            <span className="block w-5 h-0.5 bg-gray-600"></span>
          </button>
          <Link href="/" className="font-bold text-[#A32D2D] text-lg tracking-tight">chigum korean</Link>
          <span className="hidden sm:inline-block text-[11px] bg-[#A32D2D]/10 text-[#A32D2D] font-semibold px-2 py-0.5 rounded-full">コーチ</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:block text-xs text-gray-400">{user?.email}</span>
          <button onClick={handleLogout} className="text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition">ログアウト</button>
        </div>
      </header>
      <div className="flex">
        {sidebarOpen && <div className="fixed inset-0 bg-black/30 z-20 md:hidden" onClick={() => setSidebarOpen(false)} />}
        <aside className={`fixed md:sticky top-[57px] left-0 h-[calc(100vh-57px)] w-56 bg-white border-r border-gray-100 z-20 flex flex-col transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
          <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
            {MENU.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'review') {
                    router.push('/review/input')
                    return
                  }
                  setActiveMenu(item.id)
                  setSidebarOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${activeMenu === item.id ? 'bg-[#A32D2D]/10 text-[#A32D2D]' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
                {item.id === 'today' && pendingStudentBadgeCount > 0 && (
                  <span className="ml-auto min-w-[18px] h-5 px-2 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
                    {pendingStudentBadgeCount}
                  </span>
                )}
                {item.id === 'makeup' && makeupBadgeCount > 0 && (
                  <span className="ml-auto min-w-[18px] h-5 px-2 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
                    {makeupBadgeCount}
                  </span>
                )}
                {item.id === 'approvals' && approvalsBadgeCount > 0 && (
                  <span className="ml-auto min-w-[18px] h-5 px-2 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
                    {approvalsBadgeCount}
                  </span>
                )}
                {item.id === 'bookings' && bookingBadgeCount > 0 && (
                  <span className="ml-auto min-w-[18px] h-5 px-2 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
                    {bookingBadgeCount}
                  </span>
                )}
              </button>
            ))}
          </nav>
          <div className="p-4 border-t border-gray-100"><p className="text-[10px] text-gray-400 text-center">電話韓国語 チグム</p></div>
        </aside>
        <main className="flex-1 p-4 md:p-8 min-w-0">
          <div className="max-w-7xl">
            {activeMenu === 'today' && (
              <><div className="mb-6"><h1 className="text-xl font-bold text-[#0C447C]">本日のスケジュール</h1><p className="text-sm text-gray-400 mt-0.5">本日の練習一覧です</p></div><PendingStudentsNotice coachId={coachId} /><TodayScheduleReal coachId={coachId} /></>
            )}
            {activeMenu === 'week' && (
              <><div className="mb-4"><h1 className="text-xl font-bold text-[#0C447C]">週間スケジュール</h1><p className="text-sm text-gray-400 mt-0.5">選択した曜日の講義を確認できます</p></div><WeeklySchedule coachId={coachId} /></>
            )}
            {activeMenu === 'students' && (
              <><div className="mb-6"><h1 className="text-xl font-bold text-[#0C447C]">担当生徒の契約期間</h1><p className="text-sm text-gray-400 mt-0.5">各生徒さんのレッスンがいつまでかを確認できます</p></div><StudentContractsTab coachId={coachId} /></>
            )}
            {activeMenu === 'reward' && (
              <>
                <div className="mb-6">
                  <h1 className="text-xl font-bold text-[#0C447C]">報酬確認</h1>
                  <p className="text-sm text-gray-400 mt-0.5">10分レッスン ¥500 ／ 20分レッスン ¥1,000 ／ 欠席処理 ¥200 で計算されます</p>
                </div>
                <RewardTab coachId={coachId} />
              </>
            )}
            {activeMenu === 'availability' && (
              <><div className="mb-6"><h1 className="text-xl font-bold text-[#0C447C]">受講可能時間の設定</h1><p className="text-sm text-gray-400 mt-0.5">赤いマスをクリックしてオープン時間を設定します</p></div><AvailabilitySettings coachId={coachId} /></>
            )}
            {activeMenu === 'approvals' && (
              <>
                <div className="mb-6"><h1 className="text-xl font-bold text-[#0C447C]">承認待ち一覧</h1><p className="text-sm text-gray-400 mt-0.5">教材閲覧の申請が届いています</p></div>
                {pendingList.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center"><p className="text-2xl mb-3">✅</p><p className="text-gray-400 text-sm">承認待ちの申請はありません</p></div>
                ) : (
                  <div className="space-y-3">
                    {pendingList.map(req => (
                      <div key={req.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-800 truncate">{approvalsNameMap[req.student_id] || '未登録'}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{req.course_id}　第{req.lesson_number}課</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">{new Date(req.requested_at).toLocaleDateString('ja-JP')}</p>
                        </div>
                        <button onClick={() => handleApprove(req.id)} disabled={approvingId === req.id} className="flex-shrink-0 rounded-xl bg-[#0C447C] px-4 py-2 text-white text-xs font-bold hover:opacity-90 transition disabled:opacity-50">
                          {approvingId === req.id ? '処理中...' : '承認する'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
            {activeMenu === 'bookings' && (
              <>
                <div className="mb-6"><h1 className="text-xl font-bold text-[#0C447C]">予約申請一覧</h1><p className="text-sm text-gray-400 mt-0.5">生徒からのレッスン予約申請です</p></div>
                <BookingsList coachId={coachId} onPendingCountChange={setBookingBadgeCount} />
              </>
            )}
            {activeMenu === 'makeup' && (
              <>
                <div className="mb-6"><h1 className="text-xl font-bold text-[#0C447C]">補講管理</h1><p className="text-sm text-gray-400 mt-0.5">補講申請の承認とコーチ側の補講登録を行います</p></div>
                <CoachMakeup coachId={coachId} />
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}