import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import { supabase } from '../../lib/supabaseClient'

// ─── モックデータ ─────────────────────────────────────────────
const COACHES = [
  {
    id: 1,
    name: 'ヘジョン コーチ',
    nameKr: '혜정',
    intro: '初心者の方を専門に担当しています。やさしく丁寧に教えます。日本語でのサポートも可能です。',
    hours: '平日 10:00〜20:00',
    tags: ['初心者歓迎', '日本語OK'],
    emoji: '🌸',
  },
  {
    id: 2,
    name: 'ジウン コーチ',
    nameKr: '지은',
    intro: '発音矯正が得意です。K-POPや韓国ドラマが大好きで、楽しく会話練習ができます。',
    hours: '平日・土 13:00〜22:00',
    tags: ['発音専門', 'K-POP好き'],
    emoji: '🎤',
  },
  {
    id: 3,
    name: 'ミンジュン コーチ',
    nameKr: '민준',
    intro: '会話力の向上に特化した練習スタイルです。ビジネス韓国語にも対応しています。',
    hours: '月・水・金 18:00〜23:00',
    tags: ['会話重視', 'ビジネス対応'],
    emoji: '💼',
  },
  {
    id: 4,
    name: 'ソヨン コーチ',
    nameKr: '소연',
    intro: '旅行韓国語や日常会話を楽しく学べます。初めての方もリラックスして話せる雰囲気を大切にしています。',
    hours: '毎日 9:00〜18:00',
    tags: ['旅行韓国語', '初心者歓迎'],
    emoji: '✈️',
  },
]

const TIME_SLOTS = ['10:00', '10:30', '11:00', '11:30', '13:00', '13:30', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00']

// ─── ステップインジケーター ────────────────────────────────────
function StepIndicator({ step }) {
  const steps = ['コーチ選択', '日時選択', '内容確認', '完了']
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((label, i) => {
        const num = i + 1
        const done = step > num
        const active = step === num
        return (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all
                ${done ? 'bg-[#A32D2D] text-white' : active ? 'bg-[#0C447C] text-white' : 'bg-gray-200 text-gray-400'}`}>
                {done ? '✓' : num}
              </div>
              <span className={`text-[10px] mt-1 whitespace-nowrap font-medium
                ${active ? 'text-[#0C447C]' : done ? 'text-[#A32D2D]' : 'text-gray-400'}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-10 sm:w-16 h-[2px] mx-1 mb-4 transition-all ${done ? 'bg-[#A32D2D]' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── カレンダー ───────────────────────────────────────────────
function Calendar({ selected, onSelect }) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  const monthNames = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']
  const dayNames = ['日','月','火','水','木','金','土']
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = Array(firstDay).fill(null).concat(Array.from({ length: daysInMonth }, (_, i) => i + 1))
  while (cells.length % 7 !== 0) cells.push(null)

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1) }

  const isPast = (day) => {
    if (!day) return true
    const d = new Date(year, month, day)
    d.setHours(0, 0, 0, 0)
    const t = new Date(); t.setHours(0, 0, 0, 0)
    return d < t
  }

  const isSelected = (day) => {
    if (!day || !selected) return false
    return selected.getFullYear() === year && selected.getMonth() === month && selected.getDate() === day
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500">‹</button>
        <span className="font-bold text-[#0C447C]">{year}年 {monthNames[month]}</span>
        <button onClick={nextMonth} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500">›</button>
      </div>
      <div className="grid grid-cols-7 text-center mb-2">
        {dayNames.map((d, i) => (
          <div key={d} className={`text-xs font-semibold py-1 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'}`}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 text-center gap-y-1">
        {cells.map((day, i) => {
          const past = isPast(day)
          const sel = isSelected(day)
          const sun = i % 7 === 0
          const sat = i % 7 === 6
          return (
            <button
              key={i}
              disabled={!day || past}
              onClick={() => day && !past && onSelect(new Date(year, month, day))}
              className={`relative h-9 w-full flex items-center justify-center text-sm rounded-full transition
                ${!day ? '' : past ? 'text-gray-300 cursor-not-allowed' :
                  sel ? 'bg-[#0C447C] text-white font-bold' :
                  'hover:bg-[#0C447C]/10 cursor-pointer ' + (sun ? 'text-red-400' : sat ? 'text-blue-400' : 'text-gray-700')
                }`}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── メインコンポーネント ────────────────────────────────────────
export default function Booking() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState(1)

  // 予約データ
  const [selectedCoach, setSelectedCoach] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedTime, setSelectedTime] = useState(null)
  const [duration, setDuration] = useState(10)
  const [callMethod, setCallMethod] = useState('line')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      setLoading(false)
    })
  }, [])

  const formatDate = (d) => {
    if (!d) return ''
    const days = ['日','月','火','水','木','金','土']
    return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日（${days[d.getDay()]}）`
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-400 text-sm">読み込み中...</p>
    </div>
  )

  return (
    <div style={{ fontFamily: "'Noto Sans KR', sans-serif" }}>
      <Head>
        <title>練習予約 | 電話韓国語 チグム</title>
      </Head>
      <Header />

      <main className="min-h-[80vh] bg-gray-50 py-10">
        <div className="max-w-2xl mx-auto px-6">
          <div className="mb-6 text-center">
            <p className="text-sm uppercase tracking-[0.3em] text-[#A32D2D] mb-2">BOOKING</p>
            <h1 className="text-2xl font-extrabold text-[#0C447C]">練習予約</h1>
          </div>

          <StepIndicator step={step} />

          {/* Step 1: コーチ選択 */}
          {step === 1 && (
            <div>
              <h2 className="text-base font-bold text-gray-700 mb-4">コーチを選んでください</h2>
              <div className="space-y-3">
                {COACHES.map(coach => (
                  <button
                    key={coach.id}
                    onClick={() => { setSelectedCoach(coach); setStep(2) }}
                    className="w-full text-left bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-[#0C447C]/30 hover:shadow-md transition"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-[#0C447C]/10 flex items-center justify-center text-2xl flex-shrink-0">
                        {coach.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-[#0C447C]">{coach.name}</span>
                          <span className="text-xs text-gray-400">{coach.nameKr}</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2 leading-relaxed">{coach.intro}</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-gray-400">🕐 {coach.hours}</span>
                          {coach.tags.map(tag => (
                            <span key={tag} className="text-[11px] bg-[#A32D2D]/10 text-[#A32D2D] font-semibold px-2 py-0.5 rounded-full">{tag}</span>
                          ))}
                        </div>
                      </div>
                      <span className="text-gray-300 text-xl flex-shrink-0">›</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: 日時選択 */}
          {step === 2 && (
            <div>
              <button onClick={() => setStep(1)} className="text-sm text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1">
                ← コーチ選択に戻る
              </button>

              <div className="bg-[#0C447C]/5 border border-[#0C447C]/15 rounded-2xl px-4 py-3 mb-5 flex items-center gap-3">
                <span className="text-2xl">{selectedCoach?.emoji}</span>
                <div>
                  <p className="text-xs text-gray-400">選択中のコーチ</p>
                  <p className="font-bold text-[#0C447C]">{selectedCoach?.name}</p>
                </div>
              </div>

              <h2 className="text-base font-bold text-gray-700 mb-3">日付を選んでください</h2>
              <Calendar selected={selectedDate} onSelect={setSelectedDate} />

              {selectedDate && (
                <div className="mt-5">
                  <h2 className="text-base font-bold text-gray-700 mb-3">
                    {formatDate(selectedDate)} の空き時間
                  </h2>
                  <div className="grid grid-cols-4 gap-2 mb-5">
                    {TIME_SLOTS.map(t => (
                      <button
                        key={t}
                        onClick={() => setSelectedTime(t)}
                        className={`py-2.5 rounded-xl text-sm font-semibold border transition
                          ${selectedTime === t
                            ? 'bg-[#0C447C] text-white border-[#0C447C]'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-[#0C447C]/40'
                          }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>

                  <h2 className="text-base font-bold text-gray-700 mb-3">練習時間を選んでください</h2>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {[
                      { min: 10, price: '¥800', label: '10分コース' },
                      { min: 20, price: '¥1,600', label: '20分コース' },
                    ].map(d => (
                      <button
                        key={d.min}
                        onClick={() => setDuration(d.min)}
                        className={`p-4 rounded-2xl border text-left transition
                          ${duration === d.min
                            ? 'bg-[#A32D2D]/5 border-[#A32D2D] '
                            : 'bg-white border-gray-200 hover:border-gray-300'
                          }`}
                      >
                        <p className={`font-bold text-base ${duration === d.min ? 'text-[#A32D2D]' : 'text-gray-800'}`}>{d.label}</p>
                        <p className="text-sm text-gray-500 mt-0.5">{d.price} / 回</p>
                      </button>
                    ))}
                  </div>

                  <button
                    disabled={!selectedTime}
                    onClick={() => setStep(3)}
                    className="w-full rounded-2xl bg-[#0C447C] py-4 text-white font-semibold text-base hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    次へ → 内容確認
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 3: 内容確認 */}
          {step === 3 && (
            <div>
              <button onClick={() => setStep(2)} className="text-sm text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1">
                ← 日時選択に戻る
              </button>

              <h2 className="text-base font-bold text-gray-700 mb-4">通話方法を選んでください</h2>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {[
                  { id: 'line', label: 'LINE通話', icon: '💬', note: 'LINE IDで接続' },
                  { id: 'phone', label: '一般電話', icon: '📞', note: '登録の電話番号に発信' },
                ].map(m => (
                  <button
                    key={m.id}
                    onClick={() => setCallMethod(m.id)}
                    className={`p-4 rounded-2xl border text-left transition
                      ${callMethod === m.id
                        ? 'bg-[#A32D2D]/5 border-[#A32D2D]'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    <span className="text-2xl">{m.icon}</span>
                    <p className={`font-bold mt-2 ${callMethod === m.id ? 'text-[#A32D2D]' : 'text-gray-800'}`}>{m.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{m.note}</p>
                  </button>
                ))}
              </div>

              <h2 className="text-base font-bold text-gray-700 mb-4">予約内容の確認</h2>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6 space-y-3">
                {[
                  { label: 'コーチ', value: `${selectedCoach?.name}（${selectedCoach?.nameKr}）` },
                  { label: '日時', value: `${formatDate(selectedDate)} ${selectedTime}〜` },
                  { label: '練習時間', value: `${duration}分コース（¥${duration === 10 ? '800' : '1,600'} / 回）` },
                  { label: '通話方法', value: callMethod === 'line' ? 'LINE通話' : '一般電話' },
                ].map(row => (
                  <div key={row.label} className="flex items-start justify-between gap-4">
                    <span className="text-sm text-gray-400 flex-shrink-0 w-20">{row.label}</span>
                    <span className="text-sm font-semibold text-gray-800 text-right">{row.value}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setStep(4)}
                className="w-full rounded-2xl bg-[#A32D2D] py-4 text-white font-semibold text-base hover:opacity-90 transition"
              >
                予約を確定する
              </button>
            </div>
          )}

          {/* Step 4: 完了 */}
          {step === 4 && (
            <div className="bg-white rounded-3xl border border-[#E5E7EB] shadow-sm p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-[#A32D2D]/10 flex items-center justify-center mx-auto mb-5">
                <svg className="w-10 h-10 text-[#A32D2D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-extrabold text-[#A32D2D] mb-2">予約が完了しました！</h2>
              <p className="text-sm text-gray-500 mb-6">コーチから練習前にご連絡があります。</p>

              <div className="bg-gray-50 rounded-2xl p-5 text-left space-y-3 mb-6">
                {[
                  { label: 'コーチ', value: `${selectedCoach?.name}` },
                  { label: '日時', value: `${formatDate(selectedDate)} ${selectedTime}〜` },
                  { label: '練習時間', value: `${duration}分コース` },
                  { label: '通話方法', value: callMethod === 'line' ? 'LINE通話' : '一般電話' },
                ].map(row => (
                  <div key={row.label} className="flex justify-between gap-4">
                    <span className="text-sm text-gray-400 w-20">{row.label}</span>
                    <span className="text-sm font-semibold text-gray-800">{row.value}</span>
                  </div>
                ))}
              </div>

              <Link href="/dashboard/student" className="inline-block w-full rounded-2xl bg-[#0C447C] py-3 text-white font-semibold text-sm hover:opacity-90 transition">
                マイページに戻る
              </Link>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
