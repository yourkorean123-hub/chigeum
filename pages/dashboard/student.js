import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'

const MENU = [
  { id: 'home',     label: 'ホーム',        icon: '🏠' },
  { id: 'booking',  label: '練習予約',      icon: '📅' },
  { id: 'materials',label: '教材',          icon: '📚' },
  { id: 'review',   label: 'レビュー',      icon: '⭐' },
  { id: 'settings', label: '各種変更',      icon: '⚙️' },
  { id: 'billing',  label: '部活費・お支払い', icon: '💳' },
]

function CalendarWidget() {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  const monthNames = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']
  const dayNames = ['日','月','火','水','木','金','土']

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = Array(firstDay).fill(null).concat(
    Array.from({ length: daysInMonth }, (_, i) => i + 1)
  )
  while (cells.length % 7 !== 0) cells.push(null)

  const practiceDays = [5, 12, 19, 26]

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-[#0C447C] text-base">{year}年 {monthNames[month]}</h3>
        <span className="text-xs text-gray-400">練習日 <span className="inline-block w-2 h-2 rounded-full bg-[#A32D2D] ml-1 align-middle"></span></span>
      </div>
      <div className="grid grid-cols-7 text-center mb-2">
        {dayNames.map((d, i) => (
          <div key={d} className={`text-xs font-semibold pb-1 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'}`}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 text-center gap-y-1">
        {cells.map((day, i) => {
          const isToday = day === today.getDate()
          const isPractice = practiceDays.includes(day)
          const isSun = i % 7 === 0
          const isSat = i % 7 === 6
          return (
            <div key={i} className="relative flex items-center justify-center h-8">
              {day && (
                <>
                  {isToday && <span className="absolute inset-0 rounded-full bg-[#0C447C] mx-auto my-auto w-7 h-7"></span>}
                  {isPractice && !isToday && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#A32D2D]"></span>}
                  <span className={`relative text-xs font-medium z-10
                    ${isToday ? 'text-white' : ''}
                    ${!isToday && isSun ? 'text-red-400' : ''}
                    ${!isToday && isSat ? 'text-blue-400' : ''}
                    ${!isToday && !isSun && !isSat ? 'text-gray-700' : ''}
                  `}>{day}</span>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)

function CheckoutForm({ amount, onSuccess }) {
  const stripe = useStripe()
  const elements = useElements()
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async () => {
    if (!stripe || !elements) return
    setPaying(true)
    setError(null)

    try {
      // サーバーに PaymentIntent の作成を依頼
      const res = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      })
      const data = await res.json()
      if (!res.ok || !data.clientSecret) {
        setError(data.error || '決済の初期化に失敗しました')
        setPaying(false)
        return
      }

      // カード情報で実際に課金を確定
      const card = elements.getElement(CardElement)
      const { error: confirmError } = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: { card },
      })

      if (confirmError) {
        setError(confirmError.message)
        setPaying(false)
        return
      }

      // 課金成功
      onSuccess()
    } catch (err) {
      setError('決済処理中にエラーが発生しました')
    } finally {
      setPaying(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="font-bold text-[#0C447C] mb-1">お支払い情報</p>
      <p className="text-sm text-gray-500 mb-4">月額 ¥{amount.toLocaleString()}</p>
      <div className="border border-gray-200 rounded-xl p-3 mb-4">
        <CardElement options={{ hidePostalCode: true, style: { base: { fontSize: '16px' } } }} />
      </div>
      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
      <button
        onClick={handleSubmit}
        disabled={!stripe || paying}
        className="w-full bg-[#A32D2D] text-white font-bold py-3 rounded-2xl hover:opacity-90 transition disabled:opacity-40"
      >
        {paying ? '処理中...' : `¥${amount.toLocaleString()} を支払う`}
      </button>
    </div>
  )
}

function StripeCheckout({ amount, onSuccess }) {
  return (
    <Elements stripe={stripePromise} options={{ locale: 'ja' }}>
      <CheckoutForm amount={amount} onSuccess={onSuccess} />
    </Elements>
  )
}

const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土']

function SchedulePicker({ studentId }) {
  const [schedule, setSchedule] = useState([])
  const [coachName, setCoachName] = useState('')
  const [coachId, setCoachId] = useState(null)
  const [selected, setSelected] = useState(null)
  const [booking, setBooking] = useState(false)
  const [done, setDone] = useState(false)
  const [profile, setProfile] = useState(null)

  const calcAmount = () => {
    if (!profile) return null
    const { course, frequency, duration } = profile
    const pricePerSession = course === '10min' ? 800 : course === '20min' ? 1600 : null
    const sessionsPerMonth = { weekly1: 4, weekly2: 8, weekly3: 12, daily: 30 }[frequency] || null
    if (!pricePerSession || !sessionsPerMonth) return null
    const monthly = pricePerSession * sessionsPerMonth
    return duration === '3months' ? Math.floor(monthly * 0.95) : monthly
  }

  useEffect(() => {
    if (!studentId) return
    supabase.from('profiles').select('coach_id, line_id, course, frequency, duration').eq('id', studentId).single().then(({ data }) => {
      if (!data?.coach_id) return
      setProfile(data)
      setCoachId(data.coach_id)
      supabase.from('coaches').select('name').eq('id', data.coach_id).single().then(({ data: c }) => {
        setCoachName(c?.name || '')
      })
      supabase.from('coach_schedule').select('*').eq('coach_id', data.coach_id).eq('is_open', true).order('day_of_week').order('hour').order('minute').then(({ data: slots }) => {
        setSchedule(slots || [])
      })
    })
  }, [studentId])

  const grouped = schedule.reduce((acc, slot) => {
    const key = slot.day_of_week
    if (!acc[key]) acc[key] = []
    acc[key].push(slot)
    return acc
  }, {})

  const handleBook = async () => {
    if (!selected || !studentId || !coachId) return
    setBooking(true)
    await supabase.from('lesson_bookings').insert({
      student_id: studentId,
      coach_id: coachId,
      day_of_week: selected.day_of_week,
      hour: selected.hour,
      minute: selected.minute,
      duration_min: 10,
      method: 'LINE',
      contact: profile?.line_id || '',
      status: 'pending',
    })
    setBooking(false)
    setDone(true)
  }

  if (done) return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
      <p className="text-4xl mb-4">🎉</p>
      <p className="font-bold text-[#0C447C] text-lg mb-2">予約リクエストを送りました！</p>
      <p className="text-sm text-gray-500">コーチから確認の連絡が届きます。</p>
    </div>
  )

  if (schedule.length === 0) return (
    <p className="text-sm text-gray-400">コーチのスケジュールを読み込み中...</p>
  )

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">担当コーチ：<span className="font-bold text-[#0C447C]">{coachName}</span> の空き時間から選んでください。</p>
      <div className="space-y-4 mb-6">
        {Object.keys(grouped).sort().map(day => (
          <div key={day} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="font-bold text-[#0C447C] text-sm mb-3">{DAY_NAMES[day]}曜日</p>
            <div className="flex flex-wrap gap-2">
              {grouped[day].map(slot => {
                const isSelected = selected?.day_of_week === slot.day_of_week && selected?.hour === slot.hour && selected?.minute === slot.minute
                return (
                  <button
                    key={slot.id}
                    onClick={() => setSelected(slot)}
                    className={`rounded-xl px-3 py-1.5 text-sm font-semibold border transition ${isSelected ? 'bg-[#A32D2D] text-white border-[#A32D2D]' : 'bg-white text-gray-700 border-gray-200 hover:border-[#A32D2D]'}`}
                  >
                    {String(slot.hour).padStart(2,'0')}:{String(slot.minute).padStart(2,'0')}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="bg-[#FFF8E1] border border-[#FFE082] rounded-2xl p-5 mb-4">
          <p className="font-bold text-yellow-800 mb-1">選択中の時間</p>
          <p className="text-sm text-yellow-700">{DAY_NAMES[selected.day_of_week]}曜日 {String(selected.hour).padStart(2,'0')}:{String(selected.minute).padStart(2,'0')}〜</p>
          <p className="text-xs text-yellow-600 mt-1">毎週この時間に10分間の練習を行います</p>
        </div>
      )}

      {selected && calcAmount() && (
        <StripeCheckout amount={calcAmount()} onSuccess={handleBook} />
      )}
      {selected && !calcAmount() && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-center text-sm text-yellow-700">
          部活費を計算できません。コース・頻度・期間の登録情報を確認してください。
        </div>
      )}
    </div>
  )
}

function CoachList({ studentId }) {
  const [coaches, setCoaches] = useState([])
  const [loading, setLoading] = useState(true)
  const [selecting, setSelecting] = useState(null)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    supabase.from('coaches').select('*').eq('is_active', true).order('display_order').then(({ data }) => {
      setCoaches(data || [])
      setLoading(false)
    })
    if (studentId) {
      supabase.from('profiles').select('coach_id').eq('id', studentId).single().then(({ data }) => {
        if (data) setSelected(data.coach_id)
      })
    }
  }, [studentId])

  const handleSelect = async (coachId) => {
    if (!studentId) return
    setSelecting(coachId)
    await supabase.from('profiles').update({ coach_id: coachId }).eq('id', studentId)
    setSelected(coachId)
    setSelecting(null)
    window.location.reload()
  }

  if (loading) return <p className="text-sm text-gray-400">読み込み中...</p>
  if (coaches.length === 0) return <p className="text-sm text-gray-400">現在コーチは登録されていません</p>

  return (
    <div className="space-y-4">
      {coaches.map(coach => (
        <div key={coach.id} className={`bg-white rounded-2xl border shadow-sm p-6 ${selected === coach.id ? 'border-[#A32D2D]' : 'border-gray-100'}`}>
          <div className="flex gap-4">
            {coach.photo_url ? (
              <img src={coach.photo_url} alt={coach.name} className="w-16 h-16 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-2xl">👤</div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-[#0C447C] text-base">{coach.name}</h3>
                {selected === coach.id && <span className="text-[11px] bg-[#A32D2D]/10 text-[#A32D2D] font-semibold px-2 py-0.5 rounded-full">選択中</span>}
              </div>
              {coach.bio && <p className="text-sm text-gray-600 mb-2">{coach.bio}</p>}
              {coach.availability_text && <p className="text-xs text-gray-400 mb-2">🕐 {coach.availability_text}</p>}
              {coach.tags && coach.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {coach.tags.map((tag, i) => (
                    <span key={i} className="text-[11px] bg-[#0C447C]/10 text-[#0C447C] px-2 py-0.5 rounded-full">{tag}</span>
                  ))}
                </div>
              )}
              <button
                onClick={() => handleSelect(coach.id)}
                disabled={selecting === coach.id || selected === coach.id}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${selected === coach.id ? 'bg-gray-100 text-gray-400 cursor-default' : 'bg-[#A32D2D] text-white hover:opacity-90'} disabled:opacity-50`}
              >
                {selecting === coach.id ? '処理中...' : selected === coach.id ? '選択済み' : 'このコーチを選ぶ'}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function StudentDashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeMenu, setActiveMenu] = useState('home')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [hasBooking, setHasBooking] = useState(null)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login')
      } else {
        setUser(session.user)
        setLoading(false)
          supabase.from('profiles').select('coach_id').eq('id', session.user.id).single().then(({ data }) => {
            setHasBooking(!!(data && data.coach_id))
          })
      }
    })
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-sm">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'Noto Sans KR', sans-serif" }}>
      <Head>
        <title>マイページ | 電話韓国語 チグム</title>
      </Head>

      <header className="bg-white border-b border-gray-100 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <span className="block w-5 h-0.5 bg-gray-600 mb-1"></span>
            <span className="block w-5 h-0.5 bg-gray-600 mb-1"></span>
            <span className="block w-5 h-0.5 bg-gray-600"></span>
          </button>
          <Link href="/" className="font-bold text-[#A32D2D] text-lg tracking-tight">chigum korean</Link>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:block text-xs text-gray-400">{user?.email}</span>
          <button
            onClick={handleLogout}
            className="text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition"
          >
            ログアウト
          </button>
        </div>
      </header>

      <div className="flex">
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/30 z-20 md:hidden" onClick={() => setSidebarOpen(false)} />
        )}
        <aside className={`
          fixed md:sticky top-[57px] left-0 h-[calc(100vh-57px)] w-56 bg-white border-r border-gray-100 z-20 flex flex-col
          transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
            {MENU.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'review') {
                    router.push('/review')
                    return
                  }
                  if (item.id === 'materials') {
                    router.push('/materials')
                    return
                  }
                  setActiveMenu(item.id)
                  setSidebarOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition
                  ${activeMenu === item.id
                    ? 'bg-[#A32D2D]/10 text-[#A32D2D]'
                    : 'text-gray-600 hover:bg-gray-50'
                  }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
          <div className="p-4 border-t border-gray-100">
            <p className="text-[10px] text-gray-400 text-center">電話韓国語 チグム</p>
          </div>
        </aside>

        <main className="flex-1 p-4 md:p-8 min-w-0">

          {hasBooking === false && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">👋</span>
                  <div>
                    <p className="font-bold text-yellow-800 text-sm">まずコーチを選びましょう！</p>
                    <p className="text-yellow-600 text-xs mt-0.5">コーチを選ぶと練習予約ができるようになります。</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveMenu('booking')}
                  className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold text-xs px-4 py-2 rounded-xl transition"
                >
                  コーチを選ぶ →
                </button>
              </div>
            )}

            {activeMenu === 'home' && (
            <div className="max-w-3xl">
              <div className="mb-6">
                <h1 className="text-xl font-bold text-[#0C447C]">ホーム</h1>
                <p className="text-sm text-gray-400 mt-0.5">おかえりなさい、部員さん</p>
              </div>

              {hasBooking && <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">次回練習</p>
                  <p className="text-base font-bold text-[#0C447C]">6月5日（木）</p>
                  <p className="text-sm text-gray-500 mt-0.5">20:00〜20:10</p>
                  <div className="mt-3">
                    <span className="inline-block text-[11px] bg-[#0C447C]/10 text-[#0C447C] font-semibold px-2 py-0.5 rounded-full">コーチ：へジョン</span>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">残り回数</p>
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-extrabold text-[#A32D2D]">8</span>
                    <span className="text-sm text-gray-400 mb-1">回</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">今月の残り練習回数</p>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">補講クーポン</p>
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-extrabold text-[#0C447C]">2</span>
                    <span className="text-sm text-gray-400 mb-1">枚</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">有効期限：2026年7月末</p>
                </div>
              </div>}

              {hasBooking &&
              <div className="mb-6">
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">練習カレンダー</h2>
                <CalendarWidget />
              </div>}

              <div>
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">クイックアクション</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { label: '練習を予約する', icon: '📅', menu: 'booking' },
                    { label: '教材を見る',     icon: '📚', menu: 'materials' },
                    { label: '部活費を確認',   icon: '💳', menu: 'billing' },
                  ].map((a) => (
                    <button
                      key={a.menu}
                      onClick={() => {
                        if (a.menu === 'materials') {
                          router.push('/materials')
                          return
                        }
                        setActiveMenu(a.menu)
                      }}
                      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col items-center gap-2 hover:border-[#A32D2D]/30 hover:shadow-md transition text-center"
                    >
                      <span className="text-2xl">{a.icon}</span>
                      <span className="text-xs font-semibold text-gray-600">{a.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeMenu === 'booking' && (
            <div className="max-w-3xl">
              <h1 className="text-xl font-bold text-[#0C447C] mb-6">
                {hasBooking ? '練習時間を選ぶ' : 'コーチを選ぶ'}
              </h1>
              {hasBooking
                ? <SchedulePicker studentId={user?.id} />
                : <CoachList studentId={user?.id} />
              }
            </div>
          )}

          {activeMenu !== 'home' && activeMenu !== 'booking' && (
            <div className="max-w-3xl">
              <h1 className="text-xl font-bold text-[#0C447C] mb-6">
                {MENU.find(m => m.id === activeMenu)?.label}
              </h1>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
                <p className="text-4xl mb-4">{MENU.find(m => m.id === activeMenu)?.icon}</p>
                <p className="text-gray-400 text-sm">このページは準備中です</p>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}