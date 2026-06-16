import { useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function Register() {
  const router = useRouter()
  const [callMethod, setCallMethod] = useState('phone')
  const [course, setCourse] = useState('')
  const [frequency, setFrequency] = useState('')
  const [duration, setDuration] = useState('')

  const calcPrice = () => {
    const pricePerSession = course === '10min' ? 800 : course === '20min' ? 1600 : null
    const sessionsPerMonth = { weekly1: 4, weekly2: 8, weekly3: 12, daily: 30 }[frequency] || null
    if (!pricePerSession || !sessionsPerMonth) return null
    const monthly = pricePerSession * sessionsPerMonth
    return duration === '3months' ? Math.floor(monthly * 0.95) : monthly
  }
  const price = calcPrice()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const form = e.target
    const name = form.name.value
    const furigana = form.furigana.value
    const email = form.email.value
    const password = form.password.value
    const passwordConfirm = form.passwordConfirm.value
    const course = form.course.value
    const frequency = form.frequency.value
    const duration = form.duration.value
    const contact = callMethod === 'phone' ? form.phoneNumber.value : form.lineId.value

    if (password !== passwordConfirm) {
      setError('パスワードが一致しません')
      setSubmitting(false)
      return
    }

    // Supabaseでアカウント作成
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
    if (signUpError) {
      setError('登録に失敗しました: ' + signUpError.message)
      setSubmitting(false)
      return
    }

    // メール送信
    await fetch('/api/send-registration-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, furigana, email, callMethod, contact, course, frequency, duration })
    })

    router.push('/register/complete')
  }

  return (
    <div>
      <Head>
        <title>入部届 | 電話韓国語 チグム</title>
        <meta name="description" content="仮入部の申し込みフォーム。電話またはLINE通話で韓国語レッスンを始めよう。" />
      </Head>

      <Header />

      <main className="min-h-[80vh] bg-gray-50 py-16">
        <div className="max-w-5xl mx-auto px-6">
          <div className="mb-12 text-center">
            <p className="text-sm uppercase tracking-[0.3em] text-[#A32D2D] mb-4">지금 시작해요！</p>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#0C447C] mb-4">
              入部届を送って<br />今すぐスタート
            </h1>
            <p className="text-base text-gray-600 max-w-2xl mx-auto">
              まずは無料の仮入部で、あなたの韓国語学習をチグム（今）から始めましょう。お好きな通話方法とコースを選んでください。
            </p>
          </div>

          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="space-y-6">
              <div className="rounded-3xl bg-white p-8 shadow-lg border border-[#E5E7EB]">
                <h2 className="text-2xl font-bold text-[#C8272D] mb-4">申し込み内容</h2>
                <p className="text-gray-600 leading-relaxed">
                  ご希望のコースや通話方法を選択してください。3ヶ月プランなら5%割引でお得にスタートできます。
                </p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="rounded-3xl bg-[#C8272D]/10 p-6 border border-[#F0E1E1]">
                  <h3 className="text-lg font-semibold text-[#C8272D] mb-3">10分コース</h3>
                  <p className="text-sm text-gray-700">¥800/回。忙しい方におすすめのショートレッスン。</p>
                </div>
                <div className="rounded-3xl bg-[#1E6BB8]/10 p-6 border border-[#D9E6FF]">
                  <h3 className="text-lg font-semibold text-[#1E6BB8] mb-3">20分コース</h3>
                  <p className="text-sm text-gray-700">¥1,600/回。じっくり練習したい方に最適です。</p>
                </div>
              </div>

              <div className="rounded-3xl bg-[#FFF8E1] p-6 border border-[#FFE082]">
                <h3 className="text-lg font-semibold text-[#F57F17] mb-2">🎉 3ヶ月プラン割引</h3>
                <p className="text-sm text-gray-700">3ヶ月プランをお選びいただくと<b>5%割引</b>が適用されます。</p>
                <ul className="mt-3 text-sm text-gray-600 space-y-1">
                  <li>10分コース：¥800 → <b>¥760/回</b></li>
                  <li>20分コース：¥1,600 → <b>¥1,520/回</b></li>
                </ul>
              </div>
            </section>

            <section className="rounded-3xl bg-white p-8 shadow-lg border border-[#E5E7EB]">
              <h2 className="text-2xl font-bold text-[#0C447C] mb-6">入部届フォーム</h2>
              {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="name">お名前（必須）</label>
                  <input id="name" name="name" type="text" required className="w-full rounded-2xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#C8272D]/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="furigana">フリガナ（必須）</label>
                  <input id="furigana" name="furigana" type="text" required className="w-full rounded-2xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#C8272D]/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="email">メールアドレス（必須）</label>
                  <input id="email" name="email" type="email" required className="w-full rounded-2xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#C8272D]/50" />
                </div>
                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="password">パスワード（必須・8文字以上）</label>
                    <input id="password" name="password" type="password" minLength={8} required className="w-full rounded-2xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#C8272D]/50" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="passwordConfirm">パスワード確認（必須）</label>
                    <input id="passwordConfirm" name="passwordConfirm" type="password" required className="w-full rounded-2xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#C8272D]/50" />
                  </div>
                </div>
                <div className="rounded-3xl bg-[#F8FAFC] p-6 border border-gray-200">
                  <p className="text-sm font-semibold text-gray-800 mb-4">通話方法の選択（必須）</p>
                  <div className="grid gap-3">
                    <label className="flex items-center gap-3 rounded-2xl border border-gray-300 px-4 py-3 cursor-pointer">
                      <input type="radio" name="callMethod" value="phone" checked={callMethod === 'phone'} onChange={() => setCallMethod('phone')} className="accent-[#C8272D]" />
                      <span className="text-gray-700">一般電話</span>
                    </label>
                    <label className="flex items-center gap-3 rounded-2xl border border-gray-300 px-4 py-3 cursor-pointer">
                      <input type="radio" name="callMethod" value="line" checked={callMethod === 'line'} onChange={() => setCallMethod('line')} className="accent-[#C8272D]" />
                      <span className="text-gray-700">LINE通話</span>
                    </label>
                  </div>
                  {callMethod === 'phone' ? (
                    <div className="mt-5">
                      <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="phoneNumber">電話番号</label>
                      <input id="phoneNumber" name="phoneNumber" type="tel" required className="w-full rounded-2xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#C8272D]/50" />
                    </div>
                  ) : (
                    <div className="mt-5">
                      <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="lineId">LINE ID</label>
                      <input id="lineId" name="lineId" type="text" required className="w-full rounded-2xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#C8272D]/50" />
                    </div>
                  )}
                </div>
                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="course">希望コース（必須）</label>
                    <select id="course" name="course" required onChange={(e) => setCourse(e.target.value)} className="w-full rounded-2xl border border-gray-300 px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-[#C8272D]/50">
                      <option value="">選択してください</option>
                      <option value="10min">10分コース（¥800/回）</option>
                      <option value="20min">20分コース（¥1,600/回）</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="frequency">練習頻度（必須）</label>
                    <select id="frequency" name="frequency" required onChange={(e) => setFrequency(e.target.value)} className="w-full rounded-2xl border border-gray-300 px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-[#C8272D]/50">
                      <option value="">選択してください</option>
                      <option value="weekly1">週1回</option>
                      <option value="weekly2">週2回</option>
                      <option value="weekly3">週3回</option>
                      <option value="daily">毎日</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="duration">申し込み期間（必須）</label>
                  <select id="duration" name="duration" required onChange={(e) => setDuration(e.target.value)} className="w-full rounded-2xl border border-gray-300 px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-[#C8272D]/50">
                    <option value="">選択してください</option>
                    <option value="1month">1ヶ月</option>
                    <option value="3months">3ヶ月（5%割引）</option>
                  </select>
                </div>
                {price && (
  <div className="rounded-2xl bg-[#FFF8E1] border border-[#FFE082] px-6 py-4 text-center">
    <p className="text-sm text-gray-600 mb-1">月額料金</p>
    <p className="text-2xl font-bold text-[#C8272D]">¥{price.toLocaleString()}<span className="text-base font-normal text-gray-600">/月</span></p>
    {duration === '3months' && <p className="text-xs text-[#F57F17] mt-1">3ヶ月プラン適用中（5%割引）</p>}
  </div>
)}
<div className="flex items-start gap-3">
                  <input id="terms" name="terms" type="checkbox" required className="mt-1 h-4 w-4 accent-[#C8272D]" />
                  <label htmlFor="terms" className="text-sm text-gray-700">利用規約に同意します（必須）</label>
                </div>
                <button type="submit" disabled={submitting} className="w-full rounded-2xl bg-[#C8272D] px-6 py-4 text-white text-lg font-semibold transition hover:opacity-90 disabled:opacity-50">
                  {submitting ? '送信中...' : '入部届を送る'}
                </button>
              </form>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}