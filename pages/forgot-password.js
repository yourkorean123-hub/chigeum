import { useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { supabase } from '../lib/supabaseClient'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    setLoading(false)

    if (error) {
      console.error('[forgot-password] failed:', error)
      setError('送信に失敗しました。時間をおいて再度お試しください。')
      return
    }

    setSent(true)
  }

  return (
    <div>
      <Head>
        <title>パスワード再設定 | 電話韓国語 チグム</title>
      </Head>

      <Header minimal/>

      <main className="min-h-[80vh] bg-gray-50 py-16 flex items-center">
        <div className="max-w-md mx-auto px-6 w-full">
          <div className="mb-8 text-center">
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#0C447C] mb-2">パスワード再設定</h1>
            <p className="text-gray-600 text-sm">ご登録のメールアドレスを入力してください</p>
          </div>

          <div className="rounded-3xl bg-white p-8 shadow-lg border border-[#E5E7EB]">
            {sent ? (
              <div className="text-center space-y-4">
                <p className="text-4xl">📧</p>
                <p className="font-bold text-[#0C447C]">メールを送信しました</p>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {email} 宛にパスワード再設定のリンクをお送りしました。<br />
                  メールを開いてリンクをクリックしてください。
                </p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  メールが届かない場合は、迷惑メールフォルダもご確認ください。<br />
                  送信元は noreply@yourkorean.com です。
                </p>
                <Link href="/login" className="inline-block text-sm text-[#0C447C] hover:underline mt-2">
                  ログイン画面に戻る
                </Link>
              </div>
            ) : (
              <>
                {error && (
                  <div className="mb-4 rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <form className="space-y-5" onSubmit={handleSubmit}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="email">
                      メールアドレス
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-2xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#C8272D]/50"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-2xl bg-[#C8272D] px-6 py-4 text-white text-lg font-semibold transition hover:opacity-90 disabled:opacity-60"
                  >
                    {loading ? '送信中...' : '再設定メールを送る'}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <Link href="/login" className="text-sm text-[#0C447C] hover:underline">
                    ログイン画面に戻る
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}