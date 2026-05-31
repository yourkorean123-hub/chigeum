import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'

const MENU = [
  { id: 'today',       label: '本日のスケジュール', icon: '📋' },
  { id: 'week',        label: '週間スケジュール',   icon: '📅' },
  { id: 'review',      label: 'レビュー入力',       icon: '✏️' },
  { id: 'reward',      label: '報酬確認',           icon: '💴' },
  { id: 'availability',label: '受講可能時間の設定', icon: '⚙️' },
]

// モックデータ
const MOCK_SCHEDULE = [
  {
    id: 1,
    time: '10:00',
    member: '田中 花子',
    method: 'LINE',
    contact: 'hanako_tanaka',
    material: '初級テキスト Vol.1 / Unit 5',
    note: '先週の続きから。発音を重点的に。',
    reviewed: false,
  },
  {
    id: 2,
    time: '13:00',
    member: '佐藤 太郎',
    method: '電話',
    contact: '090-1234-5678',
    material: '中級会話テキスト / Chapter 3',
    note: '',
    reviewed: true,
  },
  {
    id: 3,
    time: '19:00',
    member: '山田 あかり',
    method: 'LINE',
    contact: 'akari_y',
    material: '初級テキスト Vol.2 / Unit 2',
    note: '仕事後なので少し遅れる可能性あり',
    reviewed: false,
  },
]

function ReviewModal({ session, onClose, onSave }) {
  const [text, setText] = useState('')
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h3 className="font-bold text-[#0C447C] mb-1">{session.member} さんのレビュー</h3>
        <p className="text-xs text-gray-400 mb-4">{session.time} ／ {session.material}</p>
        <textarea
          rows={5}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="今日の練習の様子、次回への申し送りなど"
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#A32D2D]/40 resize-none"
        />
        <div className="flex gap-3 mt-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm text-gray-500 hover:bg-gray-50 transition"
          >キャンセル</button>
          <button
            onClick={() => onSave(text)}
            className="flex-1 rounded-xl bg-[#A32D2D] py-2.5 text-sm text-white font-semibold hover:opacity-90 transition"
          >保存する</button>
        </div>
      </div>
    </div>
  )
}

function TodaySchedule({ schedule, onReview }) {
  const today = new Date()
  const dateStr = `${today.getFullYear()}年${today.getMonth()+1}月${today.getDate()}日（${'日月火水木金土'[today.getDay()]}）`

  if (schedule.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
        <p className="text-3xl mb-3">☀️</p>
        <p className="text-gray-400 text-sm">本日の練習はありません</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">{dateStr}</p>
      {schedule.map(s => (
        <div key={s.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* 時間バー */}
          <div className="flex items-center gap-3 px-5 py-3 bg-[#0C447C]/5 border-b border-gray-100">
            <span className="text-xl font-extrabold text-[#0C447C] tracking-tight">{s.time}</span>
            <span className="font-semibold text-gray-800">{s.member}</span>
            {s.reviewed && (
              <span className="ml-auto text-[11px] bg-green-50 text-green-600 border border-green-200 rounded-full px-2 py-0.5 font-semibold">レビュー済</span>
            )}
          </div>

          {/* 詳細 */}
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

          {/* アクション */}
          <div className="px-5 pb-4">
            <button
              onClick={() => onReview(s)}
              className={`w-full sm:w-auto rounded-xl px-5 py-2 text-sm font-semibold transition
                ${s.reviewed
                  ? 'bg-gray-100 text-gray-400 cursor-default'
                  : 'bg-[#A32D2D] text-white hover:opacity-90'
                }`}
              disabled={s.reviewed}
            >
              {s.reviewed ? 'レビュー入力済み' : 'レビューを入力する'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function CoachDashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeMenu, setActiveMenu] = useState('today')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [schedule, setSchedule] = useState(MOCK_SCHEDULE)
  const [reviewTarget, setReviewTarget] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login')
        return
      }
      const role = session.user.app_metadata?.role || session.user.user_metadata?.role
      if (role !== 'coach') {
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

  const handleReviewSave = (text) => {
    setSchedule(prev => prev.map(s =>
      s.id === reviewTarget.id ? { ...s, reviewed: true } : s
    ))
    setReviewTarget(null)
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
        <title>コーチページ | 電話韓国語 チグム</title>
      </Head>

      {reviewTarget && (
        <ReviewModal
          session={reviewTarget}
          onClose={() => setReviewTarget(null)}
          onSave={handleReviewSave}
        />
      )}

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
          <span className="hidden sm:inline-block text-[11px] bg-[#A32D2D]/10 text-[#A32D2D] font-semibold px-2 py-0.5 rounded-full">コーチ</span>
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
        {/* オーバーレイ（スマホ） */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/30 z-20 md:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* サイドバー */}
        <aside className={`
          fixed md:sticky top-[57px] left-0 h-[calc(100vh-57px)] w-56 bg-white border-r border-gray-100 z-20 flex flex-col
          transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
            {MENU.map(item => (
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
          <div className="max-w-3xl">

            {activeMenu === 'today' && (
              <>
                <div className="mb-6">
                  <h1 className="text-xl font-bold text-[#0C447C]">本日のスケジュール</h1>
                  <p className="text-sm text-gray-400 mt-0.5">本日の練習一覧です</p>
                </div>
                <TodaySchedule schedule={schedule} onReview={setReviewTarget} />
              </>
            )}

            {activeMenu !== 'today' && (
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
