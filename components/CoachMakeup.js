import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const DAYS = ['日', '月', '火', '水', '木', '金', '土']

function parseDurationFromCourse(course) {
  if (course === '10min') return 10
  if (course === '20min') return 20
  return 10
}

function toMinutes(hour, minute) {
  return hour * 60 + minute
}

function slotsOverlap(aStartMin, aDurMin, bStartMin, bDurMin) {
  const aEnd = aStartMin + (aDurMin || 0)
  const bEnd = bStartMin + (bDurMin || 0)
  return aStartMin < bEnd && bStartMin < aEnd
}

function formatDateOnly(value) {
  if (!value) return '未設定'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '未設定'
  return date.toLocaleDateString('ja-JP')
}

function formatDateTime(value) {
  if (!value) return '未設定'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '未設定'
  return date.toLocaleString('ja-JP', {
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

function toDateTimeLocalInput(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const tzOffsetMs = date.getTimezoneOffset() * 60000
  const localDate = new Date(date.getTime() - tzOffsetMs)
  return localDate.toISOString().slice(0, 16)
}

export default function CoachMakeup({ coachId }) {
  const [pendingRequests, setPendingRequests] = useState([])
  const [approvedRequests, setApprovedRequests] = useState([])
  const [students, setStudents] = useState([])
  const [nameMap, setNameMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [originalDate, setOriginalDate] = useState('')
  const [confirmedAt, setConfirmedAt] = useState('')
  const [note, setNote] = useState('')
  const [wantsConsultation, setWantsConsultation] = useState(false)
  const [formMessage, setFormMessage] = useState('')
  const [formError, setFormError] = useState('')
  const [editingRequestId, setEditingRequestId] = useState(null)
  const [editingConfirmedAt, setEditingConfirmedAt] = useState('')
  const [editError, setEditError] = useState('')

  useEffect(() => {
    const load = async () => {
      if (!coachId) return
      setLoading(true)

      const [studentResponse, pendingResponse, approvedResponse] = await Promise.all([
        supabase.from('profiles').select('id, name').eq('coach_id', coachId),
        supabase
          .from('lesson_makeup_requests')
          .select('id, student_id, original_date, request_type, option1_at, option2_at, wants_consultation, confirmed_at, status, note, created_at')
          .eq('coach_id', coachId)
          .eq('status', 'pending')
          .order('created_at', { ascending: true }),
        supabase
          .from('lesson_makeup_requests')
          .select('id, student_id, original_date, request_type, option1_at, option2_at, wants_consultation, confirmed_at, status, note, created_at')
          .eq('coach_id', coachId)
          .eq('status', 'approved')
          .order('confirmed_at', { ascending: true }),
      ])

      const studentRows = studentResponse.data || []
      const studentMap = Object.fromEntries(studentRows.map((s) => [s.id, s.name || '未登録']))
      setStudents(studentRows)
      setNameMap(studentMap)

      setPendingRequests(pendingResponse.data || [])
      setApprovedRequests(approvedResponse.data || [])
      setLoading(false)
    }

    load()
  }, [coachId])

  const refreshRequests = async () => {
    if (!coachId) return
    setLoading(true)
    const [{ data: pendingData }, { data: approvedData }] = await Promise.all([
      supabase
        .from('lesson_makeup_requests')
        .select('id, student_id, original_date, request_type, option1_at, option2_at, wants_consultation, confirmed_at, status, note, created_at')
        .eq('coach_id', coachId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true }),
      supabase
        .from('lesson_makeup_requests')
        .select('id, student_id, original_date, request_type, option1_at, option2_at, wants_consultation, confirmed_at, status, note, created_at')
        .eq('coach_id', coachId)
        .eq('status', 'approved')
        .order('confirmed_at', { ascending: true }),
    ])
    setPendingRequests(pendingData || [])
    setApprovedRequests(approvedData || [])
    setLoading(false)
  }

  const handleAction = async (id, status, confirmedAtValue = null) => {
    setProcessingId(id)
    const updates = { status, student_viewed_at: null }
    if (status === 'approved' && confirmedAtValue) {
      updates.confirmed_at = confirmedAtValue
    }
    const { error } = await supabase.from('lesson_makeup_requests').update(updates).eq('id', id)
    if (error) {
      console.error('[CoachMakeup] update request failed:', error)
      setProcessingId(null)
      return
    }
    await refreshRequests()
    setProcessingId(null)
  }

  const handleApprove = async (id, studentId, confirmedAtValue) => {
    setProcessingId(id)

    const confirmedDate = new Date(confirmedAtValue)
    if (Number.isNaN(confirmedDate.getTime())) {
      console.error('[CoachMakeup] invalid confirmedAt date:', confirmedAtValue)
      setProcessingId(null)
      return
    }

    const dayOfWeek = confirmedDate.getDay()
    const hour = confirmedDate.getHours()
    const minute = confirmedDate.getMinutes()

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('course')
      .eq('id', studentId)
      .single()

    if (profileError) {
      console.error('[CoachMakeup] failed to fetch student profile duration:', profileError)
    }

    const durationMinutes = parseDurationFromCourse(profile?.course)
    const appointmentStart = toMinutes(hour, minute)

    const { data: existingBookings, error: bookingError } = await supabase
      .from('lesson_bookings')
      .select('day_of_week, hour, minute, duration_min, status')
      .eq('coach_id', coachId)
      .neq('status', 'cancelled')
      .eq('day_of_week', dayOfWeek)

    if (bookingError) {
      console.error('[CoachMakeup] failed to fetch existing bookings:', bookingError)
      setProcessingId(null)
      return
    }

    const conflict = (existingBookings || []).some((booking) => {
      const bookingStart = toMinutes(booking.hour, booking.minute)
      const bookingDuration = booking.duration_min ?? durationMinutes
      return slotsOverlap(appointmentStart, durationMinutes, bookingStart, bookingDuration)
    })

    if (conflict) {
      const confirmed = window.confirm('この日時はすでに他の予約と重複しています。続行しますか？')
      if (!confirmed) {
        setProcessingId(null)
        return
      }
    }

    await handleAction(id, 'approved', confirmedAtValue)
  }

  const handleStartEdit = (id, currentConfirmedAt) => {
    setEditError('')
    setEditingRequestId(id)
    setEditingConfirmedAt(toDateTimeLocalInput(currentConfirmedAt))
  }

  const handleCancelEdit = () => {
    setEditError('')
    setEditingRequestId(null)
    setEditingConfirmedAt('')
  }

  const handleSaveReschedule = async (id, studentId) => {
    setEditError('')
    setProcessingId(id)

    if (!editingConfirmedAt) {
      setEditError('新しい日時を入力してください')
      setProcessingId(null)
      return
    }

    const confirmedDate = new Date(editingConfirmedAt)
    if (Number.isNaN(confirmedDate.getTime())) {
      setEditError('正しい日時を入力してください')
      setProcessingId(null)
      return
    }

    const dayOfWeek = confirmedDate.getDay()
    const hour = confirmedDate.getHours()
    const minute = confirmedDate.getMinutes()

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('course')
      .eq('id', studentId)
      .single()

    if (profileError) {
      console.error('[CoachMakeup] failed to fetch student profile duration:', profileError)
    }

    const durationMinutes = parseDurationFromCourse(profile?.course)
    const appointmentStart = toMinutes(hour, minute)

    const { data: existingBookings, error: bookingError } = await supabase
      .from('lesson_bookings')
      .select('day_of_week, hour, minute, duration_min, status')
      .eq('coach_id', coachId)
      .neq('status', 'cancelled')
      .eq('day_of_week', dayOfWeek)

    if (bookingError) {
      console.error('[CoachMakeup] failed to fetch existing bookings:', bookingError)
      setProcessingId(null)
      return
    }

    const conflict = (existingBookings || []).some((booking) => {
      const bookingStart = toMinutes(booking.hour, booking.minute)
      const bookingDuration = booking.duration_min ?? durationMinutes
      return slotsOverlap(appointmentStart, durationMinutes, bookingStart, bookingDuration)
    })

    if (conflict) {
      const confirmed = window.confirm('この日時はすでに他の予約と重複しています。続行しますか？')
      if (!confirmed) {
        setProcessingId(null)
        return
      }
    }

    const confirmedAtIso = confirmedDate.toISOString()
    const { error } = await supabase
      .from('lesson_makeup_requests')
      .update({ confirmed_at: confirmedAtIso, student_viewed_at: null })
      .eq('id', id)

    if (error) {
      console.error('[CoachMakeup] reschedule failed:', error)
      setEditError('日時変更の保存に失敗しました。もう一度お試しください。')
      setProcessingId(null)
      return
    }

    setEditingRequestId(null)
    setEditingConfirmedAt('')
    setProcessingId(null)
    await refreshRequests()
  }

  const handleCreateRequest = async () => {
    setFormError('')
    setFormMessage('')
    if (!selectedStudentId) {
      setFormError('生徒を選択してください')
      return
    }
    if (!originalDate) {
      setFormError('対象授業日を入力してください')
      return
    }
    if (!confirmedAt) {
      setFormError('補講日時を入力してください')
      return
    }

    setSaving(true)
    const confirmedAtIso = new Date(confirmedAt).toISOString()
    const { error } = await supabase.from('lesson_makeup_requests').insert([{
      coach_id: coachId,
      student_id: selectedStudentId,
      request_type: 'coach',
      original_date: originalDate,
      confirmed_at: confirmedAtIso,
      status: 'approved',
      student_viewed_at: null,
      wants_consultation: wantsConsultation,
      note: note || null,
    }])

    if (error) {
      console.error('[CoachMakeup] create request failed:', error)
      setFormError('補講登録に失敗しました。もう一度お試しください。')
      setSaving(false)
      return
    }

    setSelectedStudentId('')
    setOriginalDate('')
    setConfirmedAt('')
    setNote('')
    setWantsConsultation(false)
    setFormMessage('補講を登録しました')
    setSaving(false)
    await refreshRequests()
  }

  if (!coachId) {
    return <p className="text-sm text-gray-400">コーチ情報を取得中です。</p>
  }

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-[#0C447C]">承認待ち補講申請</h2>
          <p className="text-sm text-gray-500">生徒から届いた補講申請を確認して承認または却下してください。</p>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400">読み込み中...</p>
        ) : pendingRequests.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
            <p className="text-2xl mb-3">📭</p>
            <p className="text-gray-400 text-sm">承認待ちの補講申請はありません</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingRequests.map((req) => (
              <div key={req.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{nameMap[req.student_id] || '未登録'} さん</p>
                    <p className="text-xs text-gray-400 mt-1">対象授業日: {formatDateOnly(req.original_date)}</p>
                    <p className="text-xs text-gray-400 mt-1">申請日: {formatDateTime(req.created_at)}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <span className="inline-flex items-center rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200 px-2.5 py-1 text-[11px] font-semibold">申請中</span>
                    <span className="block text-xs text-gray-400">希望タイプ: {req.request_type || '未設定'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 text-sm text-gray-600">
                  <div>
                    <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">第1候補</p>
                    <p>{formatDateTime(req.option1_at)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">第2候補</p>
                    <p>{formatDateTime(req.option2_at)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">直接相談希望</p>
                    <p>{req.wants_consultation ? 'あり' : 'なし'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">備考</p>
                    <p className="whitespace-pre-wrap">{req.note || '—'}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={processingId === req.id || !req.option1_at}
                    onClick={() => handleApprove(req.id, req.student_id, req.option1_at)}
                    className="rounded-xl bg-[#0C447C] px-4 py-2 text-white text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
                  >
                    第1候補で承認
                  </button>
                  <button
                    type="button"
                    disabled={processingId === req.id || !req.option2_at}
                    onClick={() => handleApprove(req.id, req.student_id, req.option2_at)}
                    className="rounded-xl bg-[#A32D2D] px-4 py-2 text-white text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
                  >
                    第2候補で承認
                  </button>
                  <button
                    type="button"
                    disabled={processingId === req.id}
                    onClick={() => handleAction(req.id, 'rejected')}
                    className="rounded-xl bg-gray-100 px-4 py-2 text-gray-600 text-sm font-semibold hover:bg-gray-200 transition disabled:opacity-50"
                  >
                    却下
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-[#0C447C]">コーチ発信補講登録</h2>
          <p className="text-sm text-gray-500">担当生徒を選択し、対象授業日と補講日時を入力して登録します。</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm text-gray-700">
              <span>生徒</span>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#A32D2D]/40"
              >
                <option value="">担当生徒を選択してください</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>{student.name || '未登録'}</option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm text-gray-700">
              <span>対象授業日</span>
              <input
                type="date"
                value={originalDate}
                onChange={(e) => setOriginalDate(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#A32D2D]/40"
              />
            </label>
            <label className="space-y-2 text-sm text-gray-700 sm:col-span-2">
              <span>補講日時</span>
              <input
                type="datetime-local"
                value={confirmedAt}
                onChange={(e) => setConfirmedAt(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#A32D2D]/40"
              />
            </label>
            <label className="flex items-center gap-3 text-sm text-gray-700 sm:col-span-2">
              <input
                type="checkbox"
                checked={wantsConsultation}
                onChange={(e) => setWantsConsultation(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-[#A32D2D] focus:ring-[#A32D2D]"
              />
              <span>補講について直接相談を希望する</span>
            </label>
            <label className="space-y-2 text-sm text-gray-700 sm:col-span-2">
              <span>備考</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#A32D2D]/40"
              />
            </label>
          </div>

          {formError && <p className="text-sm text-red-500">{formError}</p>}
          {formMessage && <p className="text-sm text-green-600">{formMessage}</p>}

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <button
              type="button"
              onClick={handleCreateRequest}
              disabled={saving}
              className="w-full sm:w-auto rounded-xl bg-[#A32D2D] px-5 py-3 text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-50"
            >
              {saving ? '登録中...' : '補講を登録する'}
            </button>
            <p className="text-xs text-gray-400">登録後は確定済み一覧に表示されます。</p>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-[#0C447C]">確定済み補講一覧</h2>
          <p className="text-sm text-gray-500">承認済みの補講申請を日付順で確認できます。</p>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400">読み込み中...</p>
        ) : approvedRequests.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
            <p className="text-2xl mb-3">📌</p>
            <p className="text-gray-400 text-sm">確定済みの補講はありません</p>
          </div>
        ) : (
          <div className="space-y-4">
            {approvedRequests.map((req) => (
              <div key={req.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{nameMap[req.student_id] || '未登録'} さん</p>
                    <p className="text-xs text-gray-400 mt-1">対象授業日: {formatDateOnly(req.original_date)}</p>
                  </div>
                  <span className="text-sm text-[#0C447C] font-semibold">確定日時: {formatDateTime(req.confirmed_at)}</span>
                </div>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">申請タイプ</p>
                    <p>{req.request_type || '未設定'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">直接相談</p>
                    <p>{req.wants_consultation ? 'あり' : 'なし'}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">備考</p>
                    <p className="whitespace-pre-wrap text-gray-700">{req.note || '—'}</p>
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    <button
                      type="button"
                      disabled={processingId === req.id || (editingRequestId !== null && editingRequestId !== req.id)}
                      onClick={() => handleStartEdit(req.id, req.confirmed_at)}
                      className="rounded-xl bg-[#0C447C] px-4 py-2 text-white text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
                    >
                      日時変更
                    </button>
                    {editingRequestId === req.id && (
                      <div className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-4">
                        <label className="space-y-2 text-sm text-gray-700">
                          <span>新しい日時</span>
                          <input
                            type="datetime-local"
                            value={editingConfirmedAt}
                            onChange={(e) => setEditingConfirmedAt(e.target.value)}
                            className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#A32D2D]/40"
                          />
                        </label>
                        {editError && <p className="mt-2 text-sm text-red-500">{editError}</p>}
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={processingId === req.id}
                            onClick={() => handleSaveReschedule(req.id, req.student_id)}
                            className="rounded-xl bg-[#A32D2D] px-4 py-2 text-white text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
                          >
                            保存
                          </button>
                          <button
                            type="button"
                            disabled={processingId === req.id}
                            onClick={handleCancelEdit}
                            className="rounded-xl bg-gray-100 px-4 py-2 text-gray-600 text-sm font-semibold hover:bg-gray-200 transition disabled:opacity-50"
                          >
                            キャンセル
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
