import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { supabase } from '../lib/supabaseClient'

export default function Pronunciation() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400 text-sm">読み込み中...</p></div>

  return (
    <div>
      <Head><title>韓国語発音練習 | 電話韓国語 チグム</title></Head>
      <Header />
      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold text-[#0C447C] mb-2">韓国語発音練習</h1>
        <p className="text-sm text-gray-500 mb-8">まずは発音をしっかり身につけましょう。動画と音声で基礎からしっかり練習できます。</p>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center mb-8">
          <p className="text-4xl mb-4">🎙️</p>
          <h2 className="text-lg font-bold text-[#0C447C] mb-2">発音練習動画＆テキスト</h2>
          <p className="text-sm text-gray-500 mb-6">挨拶から始まる基本発音、子音・母音の解説動画とトレーニング動画を全てまとめています。</p>
          <a href="https://utage-system.com/p/4i9LTKPrHsZO" target="_blank" rel="noopener noreferrer" className="inline-block bg-[#A32D2D] text-white font-semibold px-8 py-3 rounded-xl hover:opacity-90 transition">発音練習ページを見る →</a>
        </div>
        <div className="bg-[#0C447C]/5 rounded-2xl p-6 text-center">
          <p className="text-sm font-semibold text-[#0C447C] mb-2">発音を練習したら、次は実際に話す練習へ！</p>
          <p className="text-xs text-gray-500 mb-4">ネイティブコーチとマンツーマンで韓国語を話す練習をしましょう。</p>
          <a href="/coaches" className="inline-block bg-[#0C447C] text-white font-semibold px-6 py-2.5 rounded-xl hover:opacity-90 transition text-sm">コーチを選んで話す練習へ →</a>
        </div>
      </main>
      <Footer />
    </div>
  )
}