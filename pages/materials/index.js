import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import { supabase } from '../../lib/supabaseClient'

const COURSES = [
  {
    id: 'step',
    title: '一般会話 Step 1〜5',
    subtitle: '完全初心者〜中級',
    description: '挨拶・自己紹介から日常会話まで、段階的に韓国語を身につけます。各Stepは20課構成です。',
    icon: '🗣️',
    color: '#A32D2D',
    bg: 'bg-[#A32D2D]/5',
    border: 'border-[#A32D2D]/20',
    steps: [
      { id: 'step1', label: 'Step 1', sub: '完全初心者', lessons: 20 },
      { id: 'step2', label: 'Step 2', sub: '初級', lessons: 20 },
      { id: 'step3', label: 'Step 3', sub: '初中級', lessons: 20 },
      { id: 'step4', label: 'Step 4', sub: '中級', lessons: 20 },
      { id: 'step5', label: 'Step 5', sub: '中上級', lessons: 20 },
    ],
  },
  {
    id: 'freetalk',
    title: 'フリートーク入門',
    subtitle: 'テーマ別・初中級向け',
    description: '趣味・仕事・家族・夢など、身近なテーマで会話力を高めます。',
    icon: '💬',
    color: '#0C447C',
    bg: 'bg-[#0C447C]/5',
    border: 'border-[#0C447C]/20',
    steps: [
      { id: 'freetalk1', label: '第1章', sub: '自己紹介・趣味', lessons: 8 },
      { id: 'freetalk2', label: '第2章', sub: '仕事・日常', lessons: 8 },
      { id: 'freetalk3', label: '第3章', sub: '夢・将来', lessons: 8 },
    ],
  },
  {
    id: 'travel',
    title: '旅行韓国語',
    subtitle: '空港・ホテル・食事・買い物・交通・観光',
    description: '韓国旅行で使えるフレーズを場面別に学びます。実用的な表現が満載です。',
    icon: '✈️',
    color: '#1E7E3E',
    bg: 'bg-green-50',
    border: 'border-green-200',
    steps: [
      { id: 'travel-airport', label: '空港', sub: '出入国・案内', lessons: 5 },
      { id: 'travel-hotel', label: 'ホテル', sub: 'チェックイン・リクエスト', lessons: 5 },
      { id: 'travel-food', label: '食事', sub: '注文・味の表現', lessons: 5 },
      { id: 'travel-shop', label: '買い物', sub: '値段・サイズ交渉', lessons: 5 },
      { id: 'travel-transit', label: '交通', sub: '地下鉄・タクシー', lessons: 5 },
      { id: 'travel-sightseeing', label: '観光', sub: 'おすすめスポット', lessons: 5 },
    ],
  },
  {
    id: 'kpop',
    title: 'K-POPで韓国語',
    subtitle: '推し活・コンサート・SNS・歌詞理解',
    description: 'K-POPファン必見！推し活や歌詞に出てくる韓国語を楽しく学びます。',
    icon: '🎤',
    color: '#7B3FA0',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    steps: [
      { id: 'kpop-oshi', label: '推し活', sub: 'ファンサ・応援', lessons: 6 },
      { id: 'kpop-concert', label: 'コンサート', sub: '会場・グッズ', lessons: 6 },
      { id: 'kpop-sns', label: 'SNS', sub: 'コメント・DM', lessons: 6 },
      { id: 'kpop-lyrics', label: '歌詞理解', sub: 'よく出るフレーズ', lessons: 6 },
    ],
  },
  {
    id: 'drama',
    title: 'ドラマで韓国語',
    subtitle: '定番フレーズ・感情表現・恋愛表現・日常会話',
    description: '韓国ドラマに登場するリアルな表現を学びます。感情豊かな韓国語を身につけましょう。',
    icon: '🎬',
    color: '#E8651A',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    steps: [
      { id: 'drama-basic', label: '定番', sub: '定番フレーズ', lessons: 8 },
      { id: 'drama-emotion', label: '感情', sub: '喜怒哀楽', lessons: 8 },
      { id: 'drama-love', label: '恋愛', sub: '恋愛表現', lessons: 8 },
      { id: 'drama-daily', label: '日常', sub: '日常会話', lessons: 8 },
    ],
  },
]

export default function MaterialsIndex() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      setLoading(false)
    })
  }, [])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-400 text-sm">読み込み中...</p>
    </div>
  )

  return (
    <div style={{ fontFamily: "'Noto Sans KR', sans-serif" }}>
      <Head>
        <title>教材 | 電話韓国語 チグム</title>
      </Head>
      <Header />
      <main className="min-h-[80vh] bg-gray-50 py-12">
        <div className="max-w-5xl mx-auto px-6">
          <div className="mb-10">
            <p className="text-sm uppercase tracking-[0.3em] text-[#A32D2D] mb-2">MATERIALS</p>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#0C447C]">教材一覧</h1>
            <p className="text-gray-500 text-sm mt-2">コースを選んで練習を始めましょう</p>
          </div>

          <div className="space-y-6">
            {COURSES.map(course => (
              <div key={course.id} className={`rounded-3xl bg-white border ${course.border} shadow-sm overflow-hidden`}>
                {/* コースヘッダー */}
                <div className={`${course.bg} px-6 py-5 border-b ${course.border}`}>
                  <div className="flex items-start gap-4">
                    <span className="text-3xl">{course.icon}</span>
                    <div>
                      <h2 className="text-lg font-bold" style={{ color: course.color }}>{course.title}</h2>
                      <p className="text-xs font-semibold text-gray-500 mt-0.5">{course.subtitle}</p>
                      <p className="text-sm text-gray-600 mt-1.5">{course.description}</p>
                    </div>
                  </div>
                </div>

                {/* ステップ一覧 */}
                <div className="p-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {course.steps.map(step => (
                    <Link
                      key={step.id}
                      href={`/materials/${step.id}-lesson1`}
                      className="group rounded-2xl border border-gray-100 bg-gray-50 hover:border-gray-300 hover:bg-white hover:shadow-sm transition p-4 flex flex-col gap-1"
                    >
                      <span className="text-xs font-bold" style={{ color: course.color }}>{step.label}</span>
                      <span className="text-sm font-semibold text-gray-800 group-hover:text-gray-900 leading-tight">{step.sub}</span>
                      <span className="text-[11px] text-gray-400 mt-1">{step.lessons}課</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
