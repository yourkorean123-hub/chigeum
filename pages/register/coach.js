import { useState } from 'react'
import Head from 'next/head'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import { supabase } from '../../lib/supabaseClient'

export default function CoachRegister() {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [form, setForm] = useState({
    name: '', email: '', password: '',
    bio: '', hobby: '', availability_text: ''
  })
  const [error, setError] = useState('')

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    try {
      const bioFull = form.hobby
        ? `${form.bio}\n\n【趣味・好きなこと】${form.hobby}`
        : form.bio

      const { error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          // メール確認後に profiles/coaches への INSERT を行うページへリダイレクト
          emailRedirectTo: `${window.location.origin}/register/coach-complete`,
          // フォームデータを user_metadata に保存（ブラウザを閉じても消えない）
          data: {
            name: form.name,
            bio: bioFull,
            availability_text: form.availability_text,
          },
        },
      })
      if (authError) throw authError

      setDone(true)
    } catch (e) {
      setError(e.message || '登録に失敗しました')
    }
    setLoading(false)
  }

  if (done) return (
    <div>
      <Header />
      <main className="min-h-[70vh] flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl shadow-lg p-10 text-center max-w-md mx-auto">
          <p className="text-4xl mb-4">📧</p>
          <h2 className="text-xl font-bold text-[#0C447C] mb-2">確認メールを送りました</h2>
          <p className="text-sm text-gray-500 mb-4">
            <span className="font-semibold text-gray-700">{form.email}</span> に確認メールをお送りしました。
          </p>
          <p className="text-sm text-gray-500">
            メール内のリンクをクリックすると登録が完了します。<br />
            審査が完了次第、改めてご連絡いたします。
          </p>
        </div>
      </main>
      <Footer />
    </div>
  )

  return (
    <div>
      <Head><title>コーチ登録 | 電話韓国語 チグム</title></Head>
      <Header />
      <main className="min-h-[70vh] bg-gray-50 py-16">
        <div className="max-w-xl mx-auto px-6">
          <div className="text-center mb-8">
            <p className="text-sm uppercase tracking-[0.3em] text-[#A32D2D] mb-2">COACH REGISTRATION</p>
            <h1 className="text-2xl font-bold text-[#0C447C]">コーチ登録</h1>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-8 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">お名前 *</label>
              <input value={form.name} onChange={e => update('name', e.target.value)} placeholder="例：キム・ミンジ" className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0C447C]/30" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">メールアドレス *</label>
              <input type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="example@email.com" className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0C447C]/30" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">パスワード *</label>
              <input type="password" value={form.password} onChange={e => update('password', e.target.value)} placeholder="6文字以上" className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0C447C]/30" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">自己紹介 *</label>
              <textarea rows={4} value={form.bio} onChange={e => update('bio', e.target.value)} placeholder="自己紹介を入力してください" className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0C447C]/30 resize-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">趣味・好きなこと</label>
              <input value={form.hobby} onChange={e => update('hobby', e.target.value)} placeholder="例：旅行、料理、K-POP" className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0C447C]/30" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">対応可能時間</label>
              <textarea rows={2} value={form.availability_text} onChange={e => update('availability_text', e.target.value)} placeholder="例：平日 20:00〜22:00、土日 10:00〜13:00" className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0C447C]/30 resize-none" />
            </div>
            <p className="text-xs text-gray-400">※ プロフィール写真はログイン後のダッシュボードから設定できます</p>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button onClick={handleSubmit} disabled={loading || !form.name || !form.email || !form.password || !form.bio} className="w-full rounded-xl bg-[#A32D2D] px-6 py-3 text-white font-semibold hover:opacity-90 transition disabled:opacity-50">
              {loading ? '送信中...' : '確認メールを送る'}
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}