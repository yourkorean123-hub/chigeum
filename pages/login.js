import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { supabase } from '../lib/supabaseClient'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    console.log('[Supabase] URL:', process.env.NEXT_PUBLIC_SUPABASE_URL || 'UNDEFINED')
    console.log('[Supabase] KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'UNDEFINED')
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    console.log('[Login] Attempting signInWithPassword...')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    console.log('[Login] Result:', { data, error })

    if (error) {
      console.error('[Login] Auth error:', error.message, error.status)
      setError(`ログイン失敗: ${error.message} (status: ${error.status})`)
      setLoading(false)
      return
    }

    console.log('[Login] Success, fetching profile for user:', data.user.id)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    console.log('[Login] Profile:', profile, 'Error:', profileError)

    if (profile?.role === 'coach') {
      router.push('/dashboard/coach')
    } else {
      router.push('/dashboard/student')
    }
  }

  return (
    <div>
      <Head>
        <title>ログイン | 電話韓国語 チグム</title>
        <meta name="description" content="電話韓国語 チグムへログイン" />
      </Head>

      <Header />

      <main className="min-h-[80vh] bg-gray-50 py-16 flex items-center">
        <div className="max-w-md mx-auto px-6 w-full">
          <div className="mb-8 text-center">
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#0C447C] mb-2">ログイン</h1>
            <p className="text-gray-600 text-sm">メールアドレスとパスワードでログインしてください</p>
          </div>

          <div className="rounded-3xl bg-white p-8 shadow-lg border border-[#E5E7EB]">
            {error && (
              <div className="mb-4 rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 break-all">
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="password">
                  パスワード
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#C8272D]/50"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-[#C8272D] px-6 py-4 text-white text-lg font-semibold transition hover:opacity-90 disabled:opacity-60"
              >
                {loading ? 'ログイン中...' : 'ログイン'}
              </button>
            </form>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
