import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'

const MENU = [
  { id: 'dashboard', label: 'ダッシュボード',     icon: '📊' },
  { id: 'members',   label: '部員（生徒）管理',   icon: '👥' },
  { id: 'coaches',   label: 'コーチ管理',         icon: '🎤' },
  { id: 'sales',     label: '売上管理',            icon: '💴' },
  { id: 'inquiries', label: 'お問い合わせ管理',   icon: '📩' },
]

const MONTHLY_SALES = [
  { month: '1月', amount: 128000 },
  { month: '2月', amount: 145000 },
  { month: '3月', amount: 162000 },
  { month: '4月', amount: 158000 },
  { month: '5月', amount: 174000 },
  { month: '6月', amount: 191000 },
]

function SalesChart({ data }) {
  const max = Math.max(...data.map(d => d.amount))
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-5">売上月別推移</h3>
      <div className="flex items-end gap-3 h-40">
        {data.map((d, i) => {
          const pct = (d.amount / max) * 100
          return (
            <div key={i} className="flex flex-col items-center gap-1 flex-1">
              <span className="text-[10px] text-gray-500">{(d.amount / 10000).toFixed(0)}万</span>
              <div className="w-full rounded-t-lg" style={{ height: `${pct}%`, background: '#A32D2D', opacity: 0.7 + (i / data.length) * 0.3 }} />
              <span className="text-[10px] text-gray-400">{d.month}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StatCard({ label, value, unit, icon, color }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
        <span className="text-xl">{icon}</span>
      </div>
      <div className="flex items-end gap-1">
        <span className="text-3xl font-extrabold" style={{ color }}>{value}</span>
        <span className="text-sm text-gray-400 mb-1">{unit}</span>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeMenu, setActiveMenu] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (profile?.role !== 'admin') {
        router.push('/dashboard/student')
        return
      }
      setUser(session.user)
      setLoading(false)
    })
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-400 text-sm">読み込み中...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'Noto Sans KR', sans-serif" }}>
      <Head>
        <title>管理者ページ | 電話韓国語 チグム</title>
      </Head>

      {/* トップバー */}
      <header className="bg-white border-b border-gray-100 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button className="md:hidden p-2 rounded-lg hover:bg-gray-100" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <span className="block w-5 h-0.5 bg-gray-600 mb-1" />
            <span className="block w-5 h-0.5 bg-gray-600 mb-1" />
            <span className="block w-5 h-0.5 bg-gray-600" />
          </button>
          <Link href="/" className="font-bold text-[#A32D2D] text-lg tracking-tight">chigum korean</Link>
          <span className="hidden sm:inline-block text-[11px] bg-[#0C447C]/10 text-[#0C447C] font-semibold px-2 py-0.5 rounded-full">管理者</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:block text-xs text-gray-400">{user?.email}</span>
          <button onClick={handleLogout} className="text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition">
            ログアウト
          </button>
        </div>
      </header>

      <div className="flex">
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/30 z-20 md:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* サイドバー */}
        <aside className={`fixed md:sticky top-[57px] left-0 h-[calc(100vh-57px)] w-56 bg-white border-r border-gray-100 z-20 flex flex-col transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
          <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
            {MENU.map(item => (
              <button
                key={item.id}
                onClick={() => { setActiveMenu(item.id); setSidebarOpen(false) }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition
                  ${activeMenu === item.id ? 'bg-[#0C447C]/10 text-[#0C447C]' : 'text-gray-600 hover:bg-gray-50'}`}
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
          <div className="max-w-4xl">

            {activeMenu === 'dashboard' && (
              <>
                <div className="mb-6">
                  <h1 className="text-xl font-bold text-[#0C447C]">ダッシュボード</h1>
                  <p className="text-sm text-gray-400 mt-0.5">チグム 管理画面</p>
                </div>

                {/* KPI カード */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  <StatCard label="今月の売上" value="191,000" unit="円" icon="💴" color="#A32D2D" />
                  <StatCard label="総部員数" value="48" unit="名" icon="👥" color="#0C447C" />
                  <StatCard label="総コーチ数" value="6" unit="名" icon="🎤" color="#0C447C" />
                  <StatCard label="今月の練習回数" value="312" unit="回" icon="📞" color="#A32D2D" />
                  <StatCard label="未対応お問い合わせ" value="3" unit="件" icon="📩" color="#E8651A" />
                  <StatCard label="今月の新規部員" value="7" unit="名" icon="✨" color="#1E7E3E" />
                </div>

                {/* 売上グラフ */}
                <SalesChart data={MONTHLY_SALES} />
              </>
            )}

            {activeMenu !== 'dashboard' && (
              <>
                <div className="mb-6">
                  <h1 className="text-xl font-bold text-[#0C447C]">
                    {MENU.find(m => m.id === activeMenu)?.label}
                  </h1>
                </div>
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
