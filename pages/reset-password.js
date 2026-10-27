import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { supabase } from '../lib/supabaseClient'

export default function ResetPassword() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [ready, setReady] = useState(false)
  const [invalid, setInvalid] = useState(false)

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setReady(true)
      }
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setReady(true)
      } else {
        setTimeout(() => {
          supabase.auth.getSession().then(({ data: { session: s } }) => {
            if (s) setReady(true)
            else setInvalid(true)
          })
        }, 1500)
      }
    })

    return () => listener?.subscription?.unsubscribe()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('パスワードは8文字以上で入力してください')
      return
    }
    if (password !== passwordConfirm) {
      setError('パスワードが一致しません')
      return
    }

    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password })
    setSaving(false)

    if (error) {
      console.error('[reset-password] failed:', error)
      setError('変更に失敗しました。リンクの有効期限が切れている可能性があります。')
      return
    }

    setDone(true)
  }

  return (
    <div>
      <Head>
        <title>新しいパスワードの設定 | 電話韓国語 チグム</title>
      </Head>

      <Header minimal/>

      <main className="min-h-[80vh] bg-gray-50 py-16 flex items-center">
        <div className="max-w-md mx-auto px-6 w-full">
          <div className="mb-8 text-center">
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#0C447C] mb-2">新しいパスワードの設定</h1>
            <p className="text-gray-600 text-sm">新しいパスワードを入力してください</p>
          </div>

          <div className="rounded-3xl bg-white p-8 shadow-lg border border-[#E5E7EB]">
            {done ? (
              <div className="text-center space-y-4">
                <p className="text-4xl">✅</p>
                <p className="font-bold text-[#0C447C]">パスワードを変更しました</p>
                <p className="text-sm text-gray-600">新しいパスワードでログインできます。</p>
                <button
                  onClick={() => router.push('/login')}
                  className="w-full rounded-2xl bg-[#C8272D] px-6 py-3 text-white font-semibold transition hover:opacity-90 mt-2"
                >
                  ログイン画面へ
                </button>
              </div>
            ) : invalid ? (
              <div className="text-center space-y-4">
                <p className="text-4xl">⚠️</p>
                <p className="font-bold text-[#0C447C]">リンクが無効です</p>
                <p className="text-sm text-gray-600 leading-relaxed">
                  リンクの有効期限が切れているか、すでに使用済みの可能性があります。<br />
                  もう一度お試しください。
                </p>
                <Link href="/forgot-password" className="inline-block text-sm text-[#0C447C] hover:underline mt-2">
                  再設定メールを送り直す
                </Link>
              </div>
            ) : !ready ? (
              <p className="text-sm text-gray-400 text-center">確認中...</p>
            ) : (
              <>
                {error && (
                  <div className="mb-4 rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <form className="space-y-5" onSubmit={handleSubmit}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="password">
                      新しいパスワード（8文字以上）
                    </label>
                    <input
                      id="password"
                      type="password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-2xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#C8272D]/50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="passwordConfirm">
                      新しいパスワード（確認）
                    </label>
                    <input
                      id="passwordConfirm"
                      type="password"
                      required
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      className="w-full rounded-2xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#C8272D]/50"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full rounded-2xl bg-[#C8272D] px-6 py-4 text-white text-lg font-semibold transition hover:opacity-90 disabled:opacity-60"
                  >
                    {saving ? '変更中...' : 'パスワードを変更する'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}