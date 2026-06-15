import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'

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
  // pad to complete last week
  while (cells.length % 7 !== 0) cells.push(null)

  // mock practice days
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
          supabase.from('bookings').select('id').eq('student_id', session.user.id).then(({ data }) => {
            setHasBooking(data && data.length > 0)
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

      {/* トップバー */}
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
        {/* サイドバー（モバイルはオーバーレイ） */}
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
                onClick={() => { setActiveMenu(item.id); setSidebarOpen(false) }}
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

        {/* メインコンテンツ */}
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

              {/* ステータスカード */}
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

              {/* カレンダー */}
              {hasBooking &&
              <div className="mb-6">
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">練習カレンダー</h2>
                <CalendarWidget />
              </div>}

              {/* クイックアクション */}
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
                      onClick={() => setActiveMenu(a.menu)}
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

          {activeMenu !== 'home' && (
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
