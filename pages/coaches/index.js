import { useEffect, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import { supabase } from '../../lib/supabaseClient'

export default function CoachesList() {
  const [coaches, setCoaches] = useState([])

  useEffect(() => {
    supabase
      .from('coaches')
      .select('id, name, bio, photo_url, tags, availability_text')
      .eq('is_active', true)
      .order('display_order')
      .then(({ data }) => {
        if (data) setCoaches(data)
      })
  }, [])

  return (
    <div>
      <Head>
        <title>コーチ一覧 | 電話韓国語 チグム</title>
        <meta name="description" content="チグムのネイティブコーチ一覧。スケジュールを確認して練習を申請しよう。" />
      </Head>

      <Header />

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold text-[#0C447C] mb-2">コーチ一覧</h1>
        <p className="text-sm text-gray-500 mb-8">気になるコーチのスケジュールを確認して、練習を申請しましょう。</p>

        <div className="space-y-6">
          {coaches.map(coach => (
            <div key={coach.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                <img
                  src={coach.photo_url || '/chogori.png'}
                  alt={coach.name}
                  className="w-24 h-24 rounded-full object-cover flex-shrink-0"
                />
                <div className="flex-1 text-center sm:text-left">
                  <div className="font-bold text-lg text-[#0C447C]">{coach.name}</div>
                  <div className="text-sm text-gray-500 mb-2">コーチ</div>
                  <p className="text-sm text-gray-700 leading-relaxed mb-3">{coach.bio}</p>
                  {coach.tags && coach.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4 justify-center sm:justify-start">
                      {coach.tags.map(tag => (
                        <span key={tag} className="text-[11px] bg-[#A32D2D]/10 text-[#A32D2D] font-semibold px-2 py-0.5 rounded-full">{tag}</span>
                      ))}
                    </div>
                  )}
                  <Link
                    href={`/coaches/${coach.id}`}
                    className="inline-block bg-[#A32D2D] text-white text-sm font-semibold px-5 py-2 rounded-xl hover:opacity-90 transition"
                  >
                    スケジュールを見る →
                  </Link>
                </div>
              </div>
            </div>
          ))}

          {coaches.length === 0 && (
            <div className="text-center py-16 text-gray-400 text-sm">読み込み中...</div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}