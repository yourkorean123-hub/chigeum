import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const formatDate = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('ja-JP', {
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

const formatDateOnly = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('ja-JP')
}

const statusLabel = (status) => {
  if (status === 'approved') return '確定'
  if (status === 'rejected') return '却下'
  return '申請中'
}

const statusClass = (status) => {
  if (status === 'approved') return 'bg-green-100 text-green-700 border border-green-200'
  if (status === 'rejected') return 'bg-gray-100 text-gray-600 border border-gray-200'
  return 'bg-yellow-50 text-yellow-700 border border-yellow-200'
}

export default function MakeupRequest({ studentId }) {
  const [profile, setProfile] = useState(null)
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [originalDate, setOriginalDate] = useState('')
  const [option1At, setOption1At] = useState('')
  const [option2At, setOption2At] = useState('')
  const [wantsConsultation, setWantsConsultation] = useState(false)
  const [note, setNote] = useState('')

  const loadData = async () => {
    if (!studentId) return
    setLoading(true)
    const [{ data: profileData }, { data: requestData }] = await Promise.all([
      supabase.from('profiles').select('coach_id').eq('id', studentId).single(),
      supabase.from('lesson_makeup_requests').select('*').eq('student_id', studentId).order('created_at', { ascending: false }),
    ])
    setProfile(profileData)
    setRequests(requestData || [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [studentId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!studentId) {
      setError('ログイン情報がありません。')
      return
    }
    if (!profile?.coach_id) {
      setError('担当コーチが見つかりません。')
      return
    }
    if (!originalDate) {
      setError('振替対象の日付を入力してください。')
      return
    }
    if (!option1At && !wantsConsultation) {
      setError('第1候補の日時を入力するか、相談希望にチェックしてください。')
      return
    }

    const { data: existingRequests, error: fetchError } = await supabase
      .from('lesson_makeup_requests')
      .select('id')
      .eq('student_id', studentId)
      .eq('original_date', originalDate)
      .limit(1)

    if (fetchError) {
      console.error('[MakeupRequest] check existing request failed', fetchError)
      setError('申請状況の確認に失敗しました。もう一度お試しください。')
      return
    }

    if (existingRequests?.length > 0) {
      setError('この授業日の補講はすでに申請済みです。日時の変更はコーチに直接ご相談ください。')
      return
    }

    setSaving(true)

    const payload = {
      student_id: studentId,
      coach_id: profile.coach_id,
      original_date: originalDate,
      request_type: 'student',
      option1_at: option1At ? new Date(option1At).toISOString() : null,
      option2_at: option2At ? new Date(option2At).toISOString() : null,
      wants_consultation: wantsConsultation,
      note: note || null,
      status: 'pending',
    }

    const { error: insertError } = await supabase.from('lesson_makeup_requests').insert([payload])
    if (insertError) {
      setError('申請の送信に失敗しました。もう一度お試しください。')
      console.error('[MakeupRequest] insert failed', insertError)
      setSaving(false)
      return
    }

    setSuccess('補講申請を送信しました。')
    setOriginalDate('')
    setOption1At('')
    setOption2At('')
    setWantsConsultation(false)
    setNote('')
    await loadData()
    setSaving(false)
  }

  if (loading) {
    return <p className="text-sm text-gray-400">読み込み中...</p>
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-[#0C447C]">補講申請履歴</h2>
            <p className="text-xs text-gray-400">過去の申請状況を確認できます。</p>
          </div>
        </div>
        {requests.length === 0 ? (
          <p className="text-sm text-gray-500">補講申請はまだありません。</p>
        ) : (
          <div className="space-y-4">
            {requests.map((item) => (
              <div key={item.id} className="bg-[#F9FAFB] rounded-2xl border border-gray-200 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="text-sm text-gray-600">申請日: {formatDate(item.created_at)}</p>
                    <p className="text-sm text-gray-600">対象授業日: {formatDateOnly(item.original_date)}</p>
                  </div>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusClass(item.status)}`}>{statusLabel(item.status)}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 text-sm text-gray-700">
                  <div>
                    <p className="font-semibold text-gray-800">第1候補</p>
                    <p>{formatDate(item.option1_at) || '-'}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">第2候補</p>
                    <p>{formatDate(item.option2_at) || '-'}</p>
                  </div>
                </div>
                {item.wants_consultation && (
                  <p className="text-sm text-[#A32D2D] mt-3">第3候補はコーチと直接相談する</p>
                )}
                {item.status === 'approved' && item.confirmed_at && (
                  <div className="mt-3 rounded-2xl bg-green-50 border border-green-100 p-3 text-sm text-green-700">
                    補講確定日時: {formatDate(item.confirmed_at)}
                  </div>
                )}
                {item.status === 'rejected' && (
                  <div className="mt-3 rounded-2xl bg-gray-50 border border-gray-100 p-3 text-sm text-gray-600">
                    コーチと直接ご相談ください
                  </div>
                )}
                {item.note && (
                  <div className="mt-3 text-sm text-gray-700">
                    <p className="font-semibold text-gray-800">備考</p>
                    <p>{item.note}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-[#0C447C]">新規申請</h2>
          <p className="text-xs text-gray-400">補講を希望する授業の日付・候補日時を入力して申請してください。</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-red-500">{error}</p>}
          {success && <p className="text-sm text-green-600">{success}</p>}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">振替対象の授業日</label>
            <input
              type="date"
              value={originalDate}
              onChange={(e) => setOriginalDate(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#A32D2D]/40"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">第1候補</label>
              <input
                type="datetime-local"
                value={option1At}
                onChange={(e) => setOption1At(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#A32D2D]/40"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">第2候補</label>
              <input
                type="datetime-local"
                value={option2At}
                onChange={(e) => setOption2At(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#A32D2D]/40"
              />
            </div>
          </div>

          <label className="flex items-center gap-3 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={wantsConsultation}
              onChange={(e) => setWantsConsultation(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-[#A32D2D] focus:ring-[#A32D2D]"
            />
            第3候補はコーチと直接相談する
          </label>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">備考</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#A32D2D]/40"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-[#A32D2D] text-white font-bold py-3 hover:opacity-90 transition disabled:opacity-50"
          >
            {saving ? '送信中...' : '補講申請を送信する'}
          </button>
        </form>
      </div>
    </div>
  )
}
