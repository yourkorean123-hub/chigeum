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
  const [coaches, setCoaches] = useState([])
  const [coachesLoading, setCoachesLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(null)
  const [members, setMembers] = useState([])
  const [membersLoading, setMembersLoading] = useState(false)

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

  useEffect(() => {
    if (activeMenu === 'coaches') fetchCoaches()
    if (activeMenu === 'members') fetchMembers()
  }, [activeMenu])

  const fetchMembers = async () => {
    setMembersLoading(true)
    const { data: profileRows } = await supabase
      .from('profiles')
      .select('id, name, furigana, course, frequency, duration, call_method, line_id, coach_id, created_at')
      .eq('role', 'student')
      .order('created_at', { ascending: false })

    const rows = profileRows || []
    const coachIds = [...new Set(rows.map((r) => r.coach_id).filter(Boolean))]
    let coachMap = {}
    if (coachIds.length > 0) {
      const { data: coachRows } = await supabase
        .from('coaches')
        .select('id, name')
        .in('id', coachIds)
      coachMap = Object.fromEntries((coachRows || []).map((c) => [c.id, c.name]))
    }

    const COURSE_LABEL = { '10min': '10分コース', '20min': '20分コース' }
    const FREQ_LABEL = { weekly1: '週1', weekly2: '週2', weekly3: '週3', daily: '毎日' }
    const DURATION_LABEL = { '1month': '1ヶ月', '3months': '3ヶ月' }

    const formatted = rows.map((r) => ({
      id: r.id,
      name: r.name || '未登録',
      furigana: r.furigana || '',
      course: COURSE_LABEL[r.course] || r.course || '',
      frequency: FREQ_LABEL[r.frequency] || r.frequency || '',
      duration: DURATION_LABEL[r.duration] || r.duration || '',
      method: r.call_method === 'phone' ? '電話' : r.call_method === 'line' ? 'LINE' : '',
      contact: r.line_id || '',
      coachName: r.coach_id ? (coachMap[r.coach_id] || '不明') : '未割当',
      createdAt: r.created_at ? new Date(r.created_at).toLocaleDateString('ja-JP') : '',
    }))
    setMembers(formatted)
    setMembersLoading(false)
  }

  const fetchCoaches = async () => {
    setCoachesLoading(true)
    const { data } = await supabase
      .from('coaches')
      .select('id, name, bio, photo_url, is_active, created_at')
      .order('created_at', { ascending: false })
    setCoaches(data || [])
    setCoachesLoading(false)
  }

  const handleApprove = async (coachId) => {
    setActionLoading(coachId + '_approve')
    await supabase.from('coaches').update({ is_active: true }).eq('id', coachId)
    await fetchCoaches()
    setActionLoading(null)
  }

  const handleRevoke = async (coachId) => {
    setActionLoading(coachId + '_revoke')
    await supabase.from('coaches').update({ is_active: false }).eq('id', coachId)
    await fetchCoaches()
    setActionLoading(null)
  }

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

            {activeMenu === 'coaches' && (
              <>
                <div className="mb-6">
                  <h1 className="text-xl font-bold text-[#0C447C]">コーチ管理</h1>
                  <p className="text-sm text-gray-400 mt-0.5">コーチの承認・管理を行います</p>
                </div>

                {coachesLoading ? (
                  <div className="text-center py-10 text-gray-400 text-sm">読み込み中...</div>
                ) : (
                  <>
                    {/* 承認待ち */}
                    <div className="mb-8">
                      <h2 className="text-sm font-bold text-[#A32D2D] uppercase tracking-wider mb-3 flex items-center gap-2">
                        <span>⏳</span> 承認待ち
                        <span className="bg-[#A32D2D] text-white text-[10px] px-2 py-0.5 rounded-full">
                          {coaches.filter(c => !c.is_active).length}
                        </span>
                      </h2>
                      {coaches.filter(c => !c.is_active).length === 0 ? (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center text-sm text-gray-400">
                          承認待ちのコーチはいません
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {coaches.filter(c => !c.is_active).map(coach => (
                            <div key={coach.id} className="bg-white rounded-2xl border border-orange-100 shadow-sm p-5 flex items-center gap-4">
                              {coach.photo_url ? (
                                <img src={coach.photo_url} alt={coach.name} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-xl">👤</div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-gray-800">{coach.name}</p>
                                <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{coach.bio}</p>
                                <p className="text-[10px] text-gray-300 mt-1">
                                  登録日：{new Date(coach.created_at).toLocaleDateString('ja-JP')}
                                </p>
                              </div>
                              <button
                                onClick={() => handleApprove(coach.id)}
                                disabled={actionLoading === coach.id + '_approve'}
                                className="flex-shrink-0 bg-[#0C447C] text-white text-sm font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition disabled:opacity-50"
                              >
                                {actionLoading === coach.id + '_approve' ? '処理中...' : '✓ 承認する'}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 承認済み */}
                    <div>
                      <h2 className="text-sm font-bold text-[#1E7E3E] uppercase tracking-wider mb-3 flex items-center gap-2">
                        <span>✅</span> 承認済みコーチ
                        <span className="bg-[#1E7E3E] text-white text-[10px] px-2 py-0.5 rounded-full">
                          {coaches.filter(c => c.is_active).length}
                        </span>
                      </h2>
                      {coaches.filter(c => c.is_active).length === 0 ? (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center text-sm text-gray-400">
                          承認済みのコーチはまだいません
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {coaches.filter(c => c.is_active).map(coach => (
                            <div key={coach.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
                              {coach.photo_url ? (
                                <img src={coach.photo_url} alt={coach.name} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-xl">👤</div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-gray-800">{coach.name}</p>
                                <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{coach.bio}</p>
                              </div>
                              <button
                                onClick={() => handleRevoke(coach.id)}
                                disabled={actionLoading === coach.id + '_revoke'}
                                className="flex-shrink-0 border border-gray-200 text-gray-500 text-sm px-4 py-2 rounded-xl hover:bg-gray-50 transition disabled:opacity-50"
                              >
                                {actionLoading === coach.id + '_revoke' ? '処理中...' : '承認取消'}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            )}

            {activeMenu === 'members' && (
              <>
                <div className="mb-6 flex items-center justify-between">
                  <h1 className="text-xl font-bold text-[#0C447C]">部員（生徒）管理</h1>
                  <span className="text-sm font-semibold text-[#A32D2D]">{members.length}名</span>
                </div>
                {membersLoading ? (
                  <p className="text-sm text-gray-400">読み込み中...</p>
                ) : members.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
                    <p className="text-4xl mb-4">👥</p>
                    <p className="text-gray-400 text-sm">登録されている部員はいません</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-[800px] w-full text-sm border-separate border-spacing-0">
                        <thead>
                          <tr>
                            <th className="bg-gray-100 text-gray-600 font-semibold px-3 py-2.5 text-left border-b border-gray-200">名前</th>
                            <th className="bg-gray-100 text-gray-600 font-semibold px-3 py-2.5 text-left border-b border-gray-200">フリガナ</th>
                            <th className="bg-gray-100 text-gray-600 font-semibold px-3 py-2.5 text-left border-b border-gray-200">コース</th>
                            <th className="bg-gray-100 text-gray-600 font-semibold px-3 py-2.5 text-left border-b border-gray-200">頻度</th>
                            <th className="bg-gray-100 text-gray-600 font-semibold px-3 py-2.5 text-left border-b border-gray-200">期間</th>
                            <th className="bg-gray-100 text-gray-600 font-semibold px-3 py-2.5 text-left border-b border-gray-200">受講方法</th>
                            <th className="bg-gray-100 text-gray-600 font-semibold px-3 py-2.5 text-left border-b border-gray-200">連絡先</th>
                            <th className="bg-gray-100 text-gray-600 font-semibold px-3 py-2.5 text-left border-b border-gray-200">担当コーチ</th>
                            <th className="bg-gray-100 text-gray-600 font-semibold px-3 py-2.5 text-left border-b border-gray-200">登録日</th>
                          </tr>
                        </thead>
                        <tbody>
                          {members.map((m) => (
                            <tr key={m.id} className="odd:bg-white even:bg-[#F6FAFF] hover:bg-[#F0F7FF] transition">
                              <td className="px-3 py-3 text-gray-800 font-medium border-b border-gray-100 whitespace-nowrap">{m.name}</td>
                              <td className="px-3 py-3 text-gray-600 border-b border-gray-100 whitespace-nowrap">{m.furigana}</td>
                              <td className="px-3 py-3 text-gray-600 border-b border-gray-100 whitespace-nowrap">{m.course}</td>
                              <td className="px-3 py-3 text-gray-600 border-b border-gray-100 whitespace-nowrap">{m.frequency}</td>
                              <td className="px-3 py-3 text-gray-600 border-b border-gray-100 whitespace-nowrap">{m.duration}</td>
                              <td className="px-3 py-3 text-gray-600 border-b border-gray-100 whitespace-nowrap">{m.method}</td>
                              <td className="px-3 py-3 text-gray-600 border-b border-gray-100 whitespace-nowrap">{m.contact}</td>
                              <td className="px-3 py-3 text-gray-600 border-b border-gray-100 whitespace-nowrap">{m.coachName}</td>
                              <td className="px-3 py-3 text-gray-400 border-b border-gray-100 whitespace-nowrap">{m.createdAt}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}

            {activeMenu !== 'dashboard' && activeMenu !== 'coaches' && activeMenu !== 'members' && (
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