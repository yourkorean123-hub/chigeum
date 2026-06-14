import { useEffect, useState, useRef } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import { supabase } from '../../lib/supabaseClient'

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
const COL_W = 68
const TIME_W = 52

function ScheduleGrid({ coachId, onSelect }) {
  const [grid, setGrid] = useState({})
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const scrollRef = useRef(null)
  const headerRef = useRef(null)

  useEffect(() => {
    if (!coachId) return
    supabase
      .from('coach_schedule')
      .select('day_of_week, hour, minute, is_open')
      .eq('coach_id', coachId)
      .then(({ data }) => {
        const g = {}
        if (data) data.forEach(({ day_of_week, hour, minute, is_open }) => { g[`${day_of_week}-${hour}-${minute}`] = is_open })
        setGrid(g)
        setLoading(false)
      })
  }, [coachId])

  const handleScroll = () => {
    if (headerRef.current && scrollRef.current) {
      headerRef.current.scrollLeft = scrollRef.current.scrollLeft
    }
  }

  const handleClick = (k, h, m, di) => {
    if (!grid[k]) return
    const sel = { key: k, h, m, di }
    setSelected(sel)
    onSelect(sel)
  }

  if (loading) return <p className="text-sm text-gray-400 py-8 text-center">読み込み中...</p>

  const hasAnyOpen = Object.values(grid).some(Boolean)
  if (!hasAnyOpen) return <div className="text-center py-10 text-gray-400 text-sm">現在オープンしている時間帯はありません</div>

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">赤いマスがレッスンを申請できる時間です。クリックして選択してください。</p>
      <div className="flex gap-4 text-xs text-gray-400 mb-3">
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-[#e85d4a]" />申請できる時間</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-[#0C447C]" />選択中</span>
      </div>

      {/* 固定ヘッダー */}
      <div ref={headerRef} style={{ overflowX: 'hidden', minWidth: 0 }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: TIME_W + COL_W * 7 }}>
          <thead>
            <tr>
              <th style={{ width: TIME_W, background: '#f8f8f8', border: '0.5px solid #e8e8e8', fontSize: 11, padding: '4px 0' }} />
              {DAYS.map((d, di) => (
                <th key={di} style={{ background: '#f8f8f8', border: '0.5px solid #e8e8e8', fontSize: 12, fontWeight: 500, color: '#666', padding: '6px 0', textAlign: 'center', width: COL_W }}>{d}</th>
              ))}
            </tr>
          </thead>
        </table>
      </div>

      {/* スクロール可能なボディ */}
      <div ref={scrollRef} onScroll={handleScroll} className="overflow-x-auto" style={{ maxHeight: 400, overflowY: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: TIME_W + COL_W * 7 }}>
          <tbody>
            {SLOTS.map(({ h, m }) => (
              <tr key={`${h}-${m}`}>
                <td style={{ border: '0.5px solid #e8e8e8', background: '#f8f8f8', textAlign: 'center', fontSize: m === 0 ? 11 : 10, fontWeight: m === 0 ? 600 : 400, color: m === 0 ? '#555' : '#bbb', padding: '0 4px', whiteSpace: 'nowrap', width: TIME_W }}>
                  {m === 0 ? `${h}時` : `${h}:${String(m).padStart(2, '0')}`}
                </td>
                {DAYS.map((_, di) => {
                  const k = `${di}-${h}-${m}`
                  const isOpen = grid[k]
                  const isSelected = selected?.key === k
                  let bg = '#fff'
                  if (isSelected) bg = '#0C447C'
                  else if (isOpen) bg = '#e85d4a'
                  return (
                    <td key={di} onClick={() => handleClick(k, h, m, di)}
                      style={{ border: '0.5px solid #e8e8e8', height: 20, cursor: isOpen ? 'pointer' : 'default', background: bg, transition: 'background 0.08s', width: COL_W }} />
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function BookingModal({ coach, slot, onClose, onDone }) {
  const [duration, setDuration] = useState(10)
  const [method, setMethod] = useState('LINE')
  const [contact, setContact] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!contact.trim()) { setError('連絡先を入力してください'); return }
    setSubmitting(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setError('ログインが必要です'); setSubmitting(false); return }
    const { error: err } = await supabase.from('lesson_bookings').insert({
      student_id: session.user.id, coach_id: coach.id,
      day_of_week: slot.di, hour: slot.h, minute: slot.m,
      duration_min: duration, method, contact: contact.trim(), status: 'pending',
    })
    if (err) { setError('申請に失敗しました。もう一度お試しください。'); setSubmitting(false); return }
    setSubmitting(false)
    onDone()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h3 className="font-bold text-[#0C447C] text-lg mb-1">レッスンを申請する</h3>
        <p className="text-sm text-gray-500 mb-5">{coach.name} コーチ ／ {DAYS[slot.di]}曜日 {slot.h}:{String(slot.m).padStart(2, '0')}〜</p>
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-500 mb-2">レッスン時間</p>
          <div className="flex gap-3">
            {[10, 20].map(d => (
              <button key={d} onClick={() => setDuration(d)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition ${duration === d ? 'bg-[#A32D2D] text-white border-[#A32D2D]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                {d}分 ／ ¥{d === 10 ? '800' : '1,600'}
              </button>
            ))}
          </div>
        </div>
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-500 mb-2">通話方法</p>
          <div className="flex gap-3">
            {['LINE', '電話'].map(m => (
              <button key={m} onClick={() => setMethod(m)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition ${method === m ? 'bg-[#A32D2D] text-white border-[#A32D2D]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                {m}
              </button>
            ))}
          </div>
        </div>
        <div className="mb-5">
          <p className="text-xs font-semibold text-gray-500 mb-2">{method === 'LINE' ? 'LINE ID' : '電話番号'}</p>
          <input type="text" value={contact} onChange={e => setContact(e.target.value)}
            placeholder={method === 'LINE' ? 'LINE IDを入力' : '電話番号を入力'}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#A32D2D]/40" />
        </div>
        {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm text-gray-500 hover:bg-gray-50 transition">キャンセル</button>
          <button onClick={handleSubmit} disabled={submitting}
            className="flex-1 rounded-xl bg-[#A32D2D] py-2.5 text-sm text-white font-semibold hover:opacity-90 transition disabled:opacity-50">
            {submitting ? '申請中...' : '申請する'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CoachDetail() {
  const router = useRouter()
  const { coachId } = router.query
  const [coach, setCoach] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!coachId) return
    supabase.from('coaches').select('id, name, bio, photo_url, tags').eq('id', coachId).single()
      .then(({ data }) => { setCoach(data); setLoading(false) })
  }, [coachId])

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400 text-sm">読み込み中...</p></div>
  if (!coach) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400 text-sm">コーチが見つかりませんでした</p></div>

  return (
    <div>
      <Head><title>{coach.name} コーチ | 電話韓国語 チグム</title></Head>
      <Header />
      {showModal && selectedSlot && (
        <BookingModal coach={coach} slot={selectedSlot} onClose={() => setShowModal(false)} onDone={() => { setShowModal(false); setDone(true) }} />
      )}
      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <img src={coach.photo_url || '/chogori.png'} alt={coach.name} className="w-24 h-24 rounded-full object-cover flex-shrink-0" />
            <div className="text-center sm:text-left">
              <div className="font-bold text-xl text-[#0C447C]">{coach.name}</div>
              <div className="text-sm text-gray-500 mb-2">コーチ</div>
              <p className="text-sm text-gray-700 leading-relaxed mb-3">{coach.bio}</p>
              {coach.tags && coach.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                  {coach.tags.map(tag => <span key={tag} className="text-[11px] bg-[#A32D2D]/10 text-[#A32D2D] font-semibold px-2 py-0.5 rounded-full">{tag}</span>)}
                </div>
              )}
            </div>
          </div>
        </div>
        {done && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-6 text-center">
            <p className="text-green-700 font-semibold mb-1">✅ 申請が完了しました！</p>
            <p className="text-sm text-green-600">コーチからの連絡をお待ちください。</p>
          </div>
        )}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-[#0C447C] mb-4">受講可能スケジュール</h2>
          <ScheduleGrid coachId={coachId} onSelect={setSelectedSlot} />
        </div>
        {selectedSlot && !done && (
          <div className="bg-white rounded-2xl border border-[#A32D2D]/20 shadow-sm p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-700">{DAYS[selectedSlot.di]}曜日 {selectedSlot.h}:{String(selectedSlot.m).padStart(2, '0')}〜 を選択中</p>
              <p className="text-xs text-gray-400 mt-0.5">この時間でレッスンを申請しますか？</p>
            </div>
            <button onClick={() => setShowModal(true)} className="flex-shrink-0 bg-[#A32D2D] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition">申請する</button>
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}