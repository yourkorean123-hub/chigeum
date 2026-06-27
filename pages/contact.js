import { useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Header from '../components/Header'
import Footer from '../components/Footer'

export default function Contact() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setErrorMsg('')

    const form = e.target
    const payload = {
      name: form.name.value,
      email: form.email.value,
      message: form.message.value,
    }

    try {
      const response = await fetch('/api/submit-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        throw new Error('送信に失敗しました')
      }
      router.push('/contact/complete')
    } catch (err) {
      console.error('[contact] submit failed:', err)
      setErrorMsg('送信に失敗しました。時間をおいて再度お試しください。')
      setSubmitting(false)
    }
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

                {errorMsg && (
                  <p className="text-sm text-red-500">{errorMsg}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-2xl bg-[#C8272D] px-6 py-4 text-white text-lg font-semibold transition hover:opacity-90 disabled:opacity-50"
                >
                  {submitting ? '送信中...' : '送信する'}
                </button>
              </form>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}