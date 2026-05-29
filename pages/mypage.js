import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { supabase } from '../lib/supabaseClient'

export default function MyPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login')
      } else {
        setUser(session.user)
        setLoading(false)
      }
    })
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    )
  }

  return (
    <div>
      <Head>
        <title>マイページ | 電話韓国語 チグム</title>
        <meta name="description" content="電話韓国語 チグム マイページ" />
      </Head>

      <Header />

      <main className="min-h-[80vh] bg-gray-50 py-16">
        <div className="max-w-2xl mx-auto px-6">
          <div className="mb-8 text-center">
            <p className="text-sm uppercase tracking-[0.3em] text-[#A32D2D] mb-3">MY PAGE</p>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#0C447C]">マイページ</h1>
          </div>

          <div className="rounded-3xl bg-white p-8 shadow-lg border border-[#E5E7EB] space-y-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">ログイン中のメールアドレス</p>
              <p className="text-base font-semibold text-gray-800">{user?.email}</p>
            </div>

            <hr className="border-gray-100" />

            <button
              onClick={handleLogout}
              className="w-full rounded-2xl border-2 border-[#C8272D] px-6 py-3 text-[#C8272D] font-semibold transition hover:bg-[#C8272D] hover:text-white"
            >
              ログアウト
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
