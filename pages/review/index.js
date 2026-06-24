import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import { supabase } from '../../lib/supabaseClient'

function StarRating({ rating }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map((i) => (
        <svg key={i} className={`w-4 h-4 ${i <= rating ? 'text-yellow-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

function formatDate(value) {
  if (!value) return ''
  const date = new Date(value)
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

export default function ReviewIndex() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [reviews, setReviews] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    const loadReviews = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const { data, error: reviewsError } = await supabase
        .from('reviews')
        .select('id, rating, comment, next_point, duration_min, created_at, coach_id')
        .eq('student_id', session.user.id)
        .order('created_at', { ascending: false })

      if (reviewsError) {
        setError(reviewsError.message)
        setLoading(false)
        return
      }

      if (!data?.length) {
        setReviews([])
        setLoading(false)
        return
      }

      const coachIds = [...new Set(data.map((review) => review.coach_id).filter(Boolean))]
      let coachNameMap = {}

      if (coachIds.length > 0) {
        const { data: coaches, error: coachError } = await supabase
          .from('coaches')
          .select('id, name')
          .in('id', coachIds)

        if (!coachError) {
          coachNameMap = Object.fromEntries((coaches || []).map((coach) => [coach.id, coach.name]))
        }
      }

      setReviews(
        (data || []).map((review) => ({
          ...review,
          coachName: coachNameMap[review.coach_id] || 'コーチ',
          dateLabel: formatDate(review.created_at),
        }))
      )
      setLoading(false)
    }

    loadReviews()
  }, [router])

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
            <button
              type="button"
              onClick={() => router.push('/dashboard/student')}
              className="mb-4 text-sm text-gray-500 hover:text-[#0C447C] flex items-center gap-1"
            >
              ← マイページに戻る
            </button>
            <p className="text-sm uppercase tracking-[0.3em] text-[#A32D2D] mb-2">REVIEW</p>
            <h1 className="text-2xl font-extrabold text-[#0C447C]">コーチからのレビュー</h1>
            <p className="text-sm text-gray-500 mt-1">練習後のフィードバックを確認しましょう</p>
          </div>

          {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

          {reviews.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-200 bg-white px-6 py-10 text-center text-sm text-gray-500">
              まだレビューがありません。
            </div>
          ) : (
            <div className="space-y-5">
              {reviews.map((review) => (
                <div key={review.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#0C447C]/10 flex items-center justify-center text-lg">
                        🌸
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#0C447C]">{review.coachName}</p>
                        <p className="text-xs text-gray-400">{review.dateLabel}{review.duration_min ? ` ／ ${review.duration_min}分` : ''}</p>
                      </div>
                    </div>
                    <StarRating rating={review.rating} />
                  </div>

                  <div className="px-5 py-4 space-y-4">
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-xs font-bold text-[#A32D2D] uppercase tracking-wider">💬 コーチからのコメント</span>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed bg-[#A32D2D]/5 rounded-2xl px-4 py-3">
                        {review.comment}
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-xs font-bold text-[#0C447C] uppercase tracking-wider">🎯 次回の練習ポイント</span>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed bg-[#0C447C]/5 rounded-2xl px-4 py-3">
                        {review.next_point}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
