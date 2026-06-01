import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import { supabase } from '../../lib/supabaseClient'

const MOCK_REVIEWS = [
  {
    id: 1,
    date: '2026年6月2日（月）',
    coach: 'ヘジョン コーチ',
    coachEmoji: '🌸',
    duration: '10分コース',
    comment: '今日は発音がとても上手になりましたね！特に「으」の音が自然に出せていました。会話のテンポも上がってきています。次回もこの調子で頑張りましょう！',
    nextPoint: '「ㄹ」の発音をもう少し意識してみましょう。語尾の「요」をしっかり伸ばすと、より自然に聞こえます。',
    rating: 5,
  },
  {
    id: 2,
    date: '2026年5月30日（土）',
    coach: 'ヘジョン コーチ',
    coachEmoji: '🌸',
    duration: '10分コース',
    comment: '自己紹介がスラスラ言えるようになってきました！単語の覚えも早いです。少し緊張していたかもしれませんが、それでも最後まで話し続けられた点が素晴らしいです。',
    nextPoint: '日常のあいさつ表現をもう少し増やしてみましょう。「잘 지냈어요?」など、会話のきっかけになるフレーズを練習します。',
    rating: 4,
  },
  {
    id: 3,
    date: '2026年5月27日（水）',
    coach: 'ヘジョン コーチ',
    coachEmoji: '🌸',
    duration: '10分コース',
    comment: '初回の練習、よく頑張りました！緊張していたと思いますが、しっかり声を出して話してくれましたね。ハングルの読み方も基本はできています。',
    nextPoint: '母音「아、야、어、여」の発音を繰り返し練習してみてください。毎日少しずつ声に出すのが上達の近道です。',
    rating: 4,
  },
]

function StarRating({ rating }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <svg key={i} className={`w-4 h-4 ${i <= rating ? 'text-yellow-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

export default function ReviewIndex() {
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
        <title>レビュー | 電話韓国語 チグム</title>
      </Head>
      <Header />

      <main className="min-h-[80vh] bg-gray-50 py-10">
        <div className="max-w-2xl mx-auto px-6">
          <div className="mb-8">
            <p className="text-sm uppercase tracking-[0.3em] text-[#A32D2D] mb-2">REVIEW</p>
            <h1 className="text-2xl font-extrabold text-[#0C447C]">コーチからのレビュー</h1>
            <p className="text-sm text-gray-500 mt-1">練習後のフィードバックを確認しましょう</p>
          </div>

          <div className="space-y-5">
            {MOCK_REVIEWS.map(review => (
              <div key={review.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                {/* ヘッダー */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#0C447C]/10 flex items-center justify-center text-lg">
                      {review.coachEmoji}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#0C447C]">{review.coach}</p>
                      <p className="text-xs text-gray-400">{review.date} ／ {review.duration}</p>
                    </div>
                  </div>
                  <StarRating rating={review.rating} />
                </div>

                <div className="px-5 py-4 space-y-4">
                  {/* コメント */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-xs font-bold text-[#A32D2D] uppercase tracking-wider">💬 コーチからのコメント</span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed bg-[#A32D2D]/5 rounded-2xl px-4 py-3">
                      {review.comment}
                    </p>
                  </div>

                  {/* 次回のポイント */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-xs font-bold text-[#0C447C] uppercase tracking-wider">🎯 次回の練習ポイント</span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed bg-[#0C447C]/5 rounded-2xl px-4 py-3">
                      {review.nextPoint}
                    </p>
                  </div>
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
