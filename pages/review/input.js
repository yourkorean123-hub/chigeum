import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import { supabase } from '../../lib/supabaseClient'

const MOCK_MEMBERS = [
  { id: 1, name: '田中 花子', course: '10分コース', time: '10:00', lastDate: '2026年6月2日' },
  { id: 2, name: '佐藤 太郎', course: '10分コース', time: '13:00', lastDate: '2026年6月2日' },
  { id: 3, name: '山田 あかり', course: '20分コース', time: '19:00', lastDate: '2026年6月2日' },
]

function StarSelector({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(i => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          className="transition hover:scale-110"
        >
          <svg className={`w-8 h-8 ${i <= value ? 'text-yellow-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      ))}
    </div>
  )
}

export default function ReviewInput() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [selectedMember, setSelectedMember] = useState(null)
  const [comment, setComment] = useState('')
  const [nextPoint, setNextPoint] = useState('')
  const [rating, setRating] = useState(5)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      setLoading(false)
    })
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    // 実際はSupabaseに保存する処理
    await new Promise(r => setTimeout(r, 800))
    setSubmitted(true)
    setSubmitting(false)
  }

  const handleReset = () => {
    setSelectedMember(null)
    setComment('')
    setNextPoint('')
    setRating(5)
    setSubmitted(false)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-400 text-sm">読み込み中...</p>
    </div>
  )

  return (
    <div style={{ fontFamily: "'Noto Sans KR', sans-serif" }}>
      <Head>
        <title>レビュー入力 | 電話韓国語 チグム</title>
      </Head>
      <Header />

      <main className="min-h-[80vh] bg-gray-50 py-10">
        <div className="max-w-2xl mx-auto px-6">
          <div className="mb-8">
            <p className="text-sm uppercase tracking-[0.3em] text-[#A32D2D] mb-2">COACH REVIEW</p>
            <h1 className="text-2xl font-extrabold text-[#0C447C]">レビュー入力</h1>
            <p className="text-sm text-gray-500 mt-1">練習後のフィードバックを部員に送りましょう</p>
          </div>

          {submitted ? (
            /* 送信完了 */
            <div className="bg-white rounded-3xl border border-[#E5E7EB] shadow-sm p-10 text-center">
              <div className="w-16 h-16 rounded-full bg-[#A32D2D]/10 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-[#A32D2D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-[#A32D2D] mb-2">レビューを送りました！</h2>
              <p className="text-sm text-gray-500 mb-6">
                <span className="font-semibold text-gray-700">{selectedMember?.name}</span> さんにフィードバックが届きます。
              </p>
              <div className="bg-gray-50 rounded-2xl p-4 text-left space-y-3 mb-6">
                <div>
                  <p className="text-xs text-gray-400 mb-1">💬 コメント</p>
                  <p className="text-sm text-gray-700">{comment}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">🎯 次回のポイント</p>
                  <p className="text-sm text-gray-700">{nextPoint}</p>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="w-full rounded-2xl bg-[#0C447C] py-3 text-white font-semibold text-sm hover:opacity-90 transition"
              >
                次の部員のレビューを入力する
              </button>
            </div>
          ) : !selectedMember ? (
            /* 部員選択 */
            <div>
              <h2 className="text-base font-bold text-gray-700 mb-4">今日練習した部員を選んでください</h2>
              <div className="space-y-3">
                {MOCK_MEMBERS.map(member => (
                  <button
                    key={member.id}
                    onClick={() => setSelectedMember(member)}
                    className="w-full text-left bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 hover:border-[#0C447C]/30 hover:shadow-md transition"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-gray-800">{member.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{member.lastDate} ／ {member.time} ／ {member.course}</p>
                      </div>
                      <span className="text-gray-300 text-xl">›</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* レビュー入力フォーム */
            <div>
              <button onClick={() => setSelectedMember(null)} className="text-sm text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1">
                ← 部員選択に戻る
              </button>

              <div className="bg-[#0C447C]/5 border border-[#0C447C]/15 rounded-2xl px-4 py-3 mb-6 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">レビュー対象</p>
                  <p className="font-bold text-[#0C447C]">{selectedMember.name}</p>
                </div>
                <p className="text-xs text-gray-500">{selectedMember.lastDate} ／ {selectedMember.time}</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 評価 */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">今日の練習の評価</label>
                  <StarSelector value={rating} onChange={setRating} />
                </div>

                {/* コメント */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    💬 コーチからのコメント <span className="text-[#A32D2D]">*</span>
                  </label>
                  <p className="text-xs text-gray-400 mb-2">今日の練習の様子や頑張った点を書いてください</p>
                  <textarea
                    required
                    rows={4}
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    placeholder="例：発音がとても上手になりました！特に「으」の音が自然に出せていました。"
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#A32D2D]/40 resize-none"
                  />
                </div>

                {/* 次回のポイント */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    🎯 次回の練習ポイント <span className="text-[#A32D2D]">*</span>
                  </label>
                  <p className="text-xs text-gray-400 mb-2">次回に向けて意識してほしいことを書いてください</p>
                  <textarea
                    required
                    rows={3}
                    value={nextPoint}
                    onChange={e => setNextPoint(e.target.value)}
                    placeholder="例：「ㄹ」の発音をもう少し意識してみましょう。語尾の「요」をしっかり伸ばすと自然に聞こえます。"
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0C447C]/40 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || !comment || !nextPoint}
                  className="w-full rounded-2xl bg-[#A32D2D] py-4 text-white font-semibold text-base hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submitting ? '送信中...' : 'レビューを送る'}
                </button>
              </form>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
