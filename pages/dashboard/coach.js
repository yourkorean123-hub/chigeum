import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'

const MENU = [
  { id: 'today',        label: '本日のスケジュール', icon: '📋' },
  { id: 'week',         label: '週間スケジュール',   icon: '📅' },
  { id: 'review',       label: 'レビュー入力',       icon: '✏️' },
  { id: 'reward',       label: '報酬確認',           icon: '💴' },
  { id: 'availability', label: '受講可能時間の設定', icon: '⚙️' },
  { id: 'approvals',    label: '承認待ち一覧',       icon: '🔓' },
  { id: 'bookings',    label: '予約申請一覧',        icon: '📩' },
]

const MOCK_SCHEDULE = [
  { id: 1, time: '10:00', member: '田中 花子', method: 'LINE', contact: 'hanako_tanaka', material: '初級テキスト Vol.1 / Unit 5', note: '先週の続きから。発音を重点的に。', reviewed: false },
  { id: 2, time: '13:00', member: '佐藤 太郎', method: '電話', contact: '090-1234-5678', material: '中級会話テキスト / Chapter 3', note: '', reviewed: true },
  { id: 3, time: '19:00', member: '山田 あかり', method: 'LINE', contact: 'akari_y', material: '初級テキスト Vol.2 / Unit 2', note: '仕事後なので少し遅れる可能性あり', reviewed: false },
]

const DAYS = ['日', '月', '火', '水', '木', '金', '土']
const START_H = 6
const END_H = 23

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

function BookingsList({ coachId }) {
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
              <p className="text-sm font-bold text-gray-800">{DAYS[b.day_of_week]}曜日 {b.hour}:{String(b.minute).padStart(2,'0')} （{b.duration_min}分）</p>
              <p className="text-xs text-gray-500 mt-0.5">{b.method} / {b.contact}</p>
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
                <span className={`inline-block w-2 h-2 rounded-full ${s.method === 'LINE' ? 'bg-green-400' : 'bg-blue-400'}`}></span>
                <span className="text-gray-800 font-medium">{s.method}</span>
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
  const [profiles, setProfiles] = useState({})
  const [reviewMap, setReviewMap] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!coachId) return

    const loadBookings = async () => {
      setLoading(true)
      const { data: bookingRows, error } = await supabase
        .from('lesson_bookings')
        .select('id, student_id, coach_id, day_of_week, hour, minute, duration_min, method, contact, status')
        .eq('coach_id', coachId)
        .eq('status', 'approved')
        .order('day_of_week', { ascending: true })
        .order('hour', { ascending: true })
        .order('minute', { ascending: true })

      if (error) {
        console.error('[coach-weekly] fetch bookings failed:', error)
        setBookings([])
        setProfiles({})
        setReviewMap({})
        setLoading(false)
        return
      }

      const studentIds = [...new Set((bookingRows || []).map((booking) => booking.student_id).filter(Boolean))]
      let profileMap = {}
      if (studentIds.length > 0) {
        const { data: profileRows } = await supabase
          .from('profiles')
          .select('id, name, line_id')
          .in('id', studentIds)
        profileMap = Object.fromEntries((profileRows || []).map((profile) => [profile.id, { name: profile.name || '未登録', line_id: profile.line_id || '' }]))
      }

      let reviewState = {}
      if (bookingRows?.length) {
        const { data: reviewRows } = await supabase
          .from('reviews')
          .select('id, booking_id, student_id, coach_id')
          .eq('coach_id', coachId)
        reviewState = Object.fromEntries((reviewRows || []).map((review) => [review.booking_id ? `booking:${review.booking_id}` : `pair:${review.student_id}:${review.coach_id}`, true]))
      }

      setBookings(bookingRows || [])
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

  const selectedBookings = bookings
    .filter((booking) => booking.day_of_week === selectedDate.getDay())
    .sort((a, b) => (a.hour * 60 + a.minute) - (b.hour * 60 + b.minute))

  const formatTime = (hour, minute, durationMin) => {
    const start = new Date(2000, 0, 1, hour, minute)
    const end = new Date(start.getTime() + durationMin * 60000)
    return `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}-${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`
  }

  const formatContact = (booking) => {
    const method = booking.method || ''
    const contact = booking.contact || ''
    if (!method && !contact) return ''
    if (!contact) return method
    return `${method}(${contact})`
  }

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
          <div className="text-sm font-semibold text-[#A32D2D]">{selectedBookings.length}講義</div>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400">読み込み中...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[600px] w-full text-sm border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="bg-gray-100 text-gray-600 font-semibold px-3 py-2 text-left border-b border-gray-200">時間</th>
                  <th className="bg-gray-100 text-gray-600 font-semibold px-3 py-2 text-left border-b border-gray-200">名前</th>
                  <th className="bg-gray-100 text-gray-600 font-semibold px-3 py-2 text-left border-b border-gray-200">ID</th>
                  <th className="bg-gray-100 text-gray-600 font-semibold px-3 py-2 text-left border-b border-gray-200">レビュー</th>
                  <th className="bg-gray-100 text-gray-600 font-semibold px-3 py-2 text-left border-b border-gray-200">教材</th>
                  <th className="bg-gray-100 text-gray-600 font-semibold px-3 py-2 text-left border-b border-gray-200">授業方式(連絡先)</th>
                  <th className="bg-gray-100 text-gray-600 font-semibold px-3 py-2 text-left border-b border-gray-200">補講</th>
                  <th className="bg-gray-100 text-gray-600 font-semibold px-3 py-2 text-left border-b border-gray-200">備考</th>
                </tr>
              </thead>
              <tbody>
                {selectedBookings.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-sm text-gray-400">この日の講義はありません</td>
                  </tr>
                ) : selectedBookings.map((booking) => {
                  const profile = profiles[booking.student_id] || { name: '未登録', line_id: '' }
                  const hasReview = Boolean(reviewMap[`booking:${booking.id}`] || reviewMap[`pair:${booking.student_id}:${booking.coach_id}`])
                  return (
                    <tr key={booking.id} className="odd:bg-white even:bg-[#F6FAFF] hover:bg-[#F0F7FF] transition">
                      <td className="px-3 py-3 text-gray-700 whitespace-nowrap border-b border-gray-100">{formatTime(booking.hour, booking.minute, booking.duration_min)}</td>
                      <td className="px-3 py-3 text-gray-700 border-b border-gray-100">{profile.name}</td>
                      <td className="px-3 py-3 text-gray-700 border-b border-gray-100">{profile.line_id}</td>
                      <td className="px-3 py-3 border-b border-gray-100">
                        {hasReview ? (
                          <Link href="/review/coach-view" className="text-[#0C447C] font-semibold hover:underline">見る</Link>
                        ) : (
                          <Link href="/review/input" className="text-[#A32D2D] font-semibold hover:underline">✏️</Link>
                        )}
                      </td>
                      <td className="px-3 py-3 text-gray-400 border-b border-gray-100"></td>
                      <td className="px-3 py-3 text-gray-700 border-b border-gray-100">{formatContact(booking)}</td>
                      <td className="px-3 py-3 text-gray-400 border-b border-gray-100"></td>
                      <td className="px-3 py-3 text-gray-400 border-b border-gray-100"></td>
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

  // 横スクロール同期
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

      {/* 固定ヘッダー */}
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

      {/* スクロール可能なボディ */}
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

  const fetchPending = async () => {
    const { data, error } = await supabase.from('lesson_access').select('id, student_id, course_id, lesson_number, status, requested_at').eq('status', 'pending').order('requested_at', { ascending: true })
    if (error) console.error('[CoachApproval] Fetch error:', error)
    setPendingList(data || [])
  }

  useEffect(() => { if (activeMenu === 'approvals') fetchPending() }, [activeMenu])

  const handleApprove = async (id) => {
    setApprovingId(id)
    await supabase.from('lesson_access').update({ status: 'approved' }).eq('id', id)
    setPendingList(prev => prev.filter(r => r.id !== id))
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
                <span className="text-base">{item.icon}</span>{item.label}
              </button>
            ))}
          </nav>
          <div className="p-4 border-t border-gray-100"><p className="text-[10px] text-gray-400 text-center">電話韓国語 チグム</p></div>
        </aside>
        <main className="flex-1 p-4 md:p-8 min-w-0">
          <div className="max-w-7xl">
            {activeMenu === 'today' && (
              <><div className="mb-6"><h1 className="text-xl font-bold text-[#0C447C]">本日のスケジュール</h1><p className="text-sm text-gray-400 mt-0.5">本日の練習一覧です</p></div><TodaySchedule schedule={schedule} onReview={setReviewTarget} /></>
            )}
            {activeMenu === 'week' && (
              <><div className="mb-4"><h1 className="text-xl font-bold text-[#0C447C]">週間スケジュール</h1><p className="text-sm text-gray-400 mt-0.5">選択した曜日の講義を確認できます</p></div><WeeklySchedule coachId={coachId} /></>
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
                          <p className="text-sm font-bold text-gray-800 truncate">{req.student_id}</p>
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
                <BookingsList coachId={coachId} />
              </>
            )}
            {activeMenu !== 'today' && activeMenu !== 'week' && activeMenu !== 'approvals' && activeMenu !== 'availability' && activeMenu !== 'bookings' && (
              <>
                <div className="mb-6"><h1 className="text-xl font-bold text-[#0C447C]">{MENU.find(m => m.id === activeMenu)?.label}</h1></div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
                  <p className="text-4xl mb-4">{MENU.find(m => m.id === activeMenu)?.icon}</p>
                  <p className="text-gray-400 text-sm">このページは準備中です</p>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}