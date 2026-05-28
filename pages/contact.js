import { useState } from 'react'
import Head from 'next/head'
import Header from '../components/Header'
import Footer from '../components/Footer'

export default function Contact() {
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <div>
      <Head>
        <title>お問い合わせ | 電話韓国語 チグム</title>
        <meta name="description" content="電話韓国語 チグムへのお問い合わせはこちらから。" />
      </Head>

      <Header />

      <main className="min-h-[80vh] bg-gray-50 py-16">
        <div className="max-w-2xl mx-auto px-6">
          <div className="mb-10 text-center">
            <p className="text-sm uppercase tracking-[0.3em] text-[#A32D2D] mb-4">お気軽にどうぞ</p>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#0C447C] mb-4">お問い合わせ</h1>
            <p className="text-base text-gray-600">
              ご質問・ご相談はこちらのフォームからお送りください。
            </p>
          </div>

          <div className="rounded-3xl bg-white p-8 shadow-lg border border-[#E5E7EB]">
            {submitted ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-[#C8272D]/10 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-[#C8272D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-lg font-semibold text-[#0C447C]">送信が完了しました。</p>
                <p className="text-gray-600 mt-2">内容を確認の上、担当者よりご連絡いたします。</p>
              </div>
            ) : (
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="name">
                    お名前（必須）
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    className="w-full rounded-2xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#C8272D]/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="email">
                    メールアドレス（必須）
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className="w-full rounded-2xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#C8272D]/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="message">
                    お問い合わせ内容（必須）
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={6}
                    className="w-full rounded-2xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#C8272D]/50 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-2xl bg-[#C8272D] px-6 py-4 text-white text-lg font-semibold transition hover:opacity-90"
                >
                  送信する
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
