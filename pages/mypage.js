import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { supabase } from '../lib/supabaseClient'

function PasswordChangeForm() {
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleChange = async () => {
    if (newPassword.length < 6) { setError('6文字以上で入力してください'); return }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSaving(false)
    if (error) { setError('変更に失敗しました'); return }
    setMessage('パスワードを変更しました！')
    setNewPassword('')
    setError('')
  }

  return (
    <div className="space-y-3">
      <input
        type="password"
        value={newPassword}
        onChange={e => setNewPassword(e.target.value)}
        placeholder="新しいパスワード（6文字以上）"
        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0C447C]/30"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      {message && <p className="text-xs text-green-600">{message}</p>}
      <button
        onClick={handleChange}
        disabled={saving}
        className="w-full rounded-xl bg-[#0C447C] px-6 py-2.5 text-sm text-white font-semibold hover:opacity-90 transition disabled:opacity-50"
      >
        {saving ? '変更中...' : 'パスワードを変更する'}
      </button>
    </div>
  )
}

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

            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3">パスワードを変更する</p>
              <PasswordChangeForm />
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
