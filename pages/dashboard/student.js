import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import MakeupRequest from '../../components/MakeupRequest'
import ChangeCoachModal from '../../components/ChangeCoachModal'

const MENU = [
  { id: 'home',     label: 'ホーム',        icon: '🏠' },
  { id: 'booking',  label: '練習予約',      icon: '📅' },
  { id: 'makeup',   label: '補講申請',      icon: '🔁' },
  { id: 'materials',label: '教材',          icon: '📚' },
  { id: 'review',   label: 'レビュー',      icon: '⭐' },
  { id: 'settings', label: '各種変更',      icon: '⚙️' },
  { id: 'billing',  label: '部活費・お支払い', icon: '💳' },
]

// 指定した日付(dateStr: 'YYYY-MM-DD')が、予約の開始日(start_date)以降かどうかを判定する。
// start_dateが未設定(null)の予約は、従来どおり常に対象とする（後方互換）。
function isOnOrAfterStart(booking, dateStr) {
  if (!booking || !booking.start_date) return true
  return dateStr >= booking.start_date
}

function toDateKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// ── 継続（更新）機能のヘルパー ──
// duration文字列が3ヶ月契約かどうか。DB・UIでは '3months'（複数形）を使うが、
// 過去データや手動修正で '3month'（単数形）が混じっても3ヶ月として扱う（表記ゆれ対策）。
function isThreeMonths(duration) {
  return duration === '3months' || duration === '3month'
}

// duration文字列を月数に変換（3ヶ月→3、それ以外→1）。
function durationMonths(duration) {
  return isThreeMonths(duration) ? 3 : 1
}

// 'YYYY-MM-DD' 文字列を Date に変換（ローカル時刻・時分は0）。
function parseDateStr(dateStr) {
  if (!dateStr) return null
  const parts = String(dateStr).split('-').map(Number)
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null
  return new Date(parts[0], parts[1] - 1, parts[2])
}

// 日付にNヶ月足した Date を返す。
function addMonths(date, months) {
  return new Date(date.getFullYear(), date.getMonth() + months, date.getDate())
}

// 契約終了日（排他的）＝ 開始日 + プラン月数。この日の手前までが受講期間。
function calcContractEndDate(startDateStr, duration) {
  const start = parseDateStr(startDateStr)
  if (!start) return null
  return addMonths(start, durationMonths(duration))
}

// 受講期間内の「最後の同曜日レッスン日」(Date)。開始日 ≤ d < 契約終了日。
function calcLastLessonDate(startDateStr, dayOfWeek, duration) {
  const start = parseDateStr(startDateStr)
  if (start === null || dayOfWeek === null || dayOfWeek === undefined) return null
  const endExclusive = addMonths(start, durationMonths(duration))
  // 契約終了日の前日から遡って、最初に該当曜日になる日。
  let d = new Date(endExclusive.getFullYear(), endExclusive.getMonth(), endExclusive.getDate() - 1)
  let guard = 0
  while (d.getDay() !== Number(dayOfWeek) && guard < 10) {
    d = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1)
    guard += 1
  }
  if (d < start) return null
  return d
}

// 「同じ内容で継続」の新しい開始日(Date)＝旧契約の終了日（排他的）。
// これを新start_dateにすると、旧契約の最後のレッスンの翌週から途切れず再開する。
function calcRenewalStartDate(startDateStr, duration) {
  return calcContractEndDate(startDateStr, duration)
}

// 固定コースの決済額（純関数版）。SchedulePickerのcalcAmountと同じ式。
function calcFixedAmount(course, frequency, duration) {
  const pricePerSession = course === '10min' ? 800 : course === '20min' ? 1600 : null
  const sessionsPerMonth = { weekly1: 4, weekly2: 8, weekly3: 12, daily: 30 }[frequency] || null
  if (!pricePerSession || !sessionsPerMonth) return null
  const monthly = pricePerSession * sessionsPerMonth
  return isThreeMonths(duration) ? Math.floor(monthly * 3 * 0.95) : monthly
}

function BillingTab({ studentId }) {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!studentId) return
    supabase
      .from('payments')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setPayments(data || [])
        setLoading(false)
      })
  }, [studentId])

  if (loading) return <p className="text-sm text-gray-400">読み込み中...</p>

  return (
    <div className="max-w-xl space-y-4">
      {payments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
          <p className="text-4xl mb-4">💳</p>
          <p className="text-gray-400 text-sm">お支払い履歴はまだありません</p>
        </div>
      ) : (
        payments.map((p) => (
          <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-[#0C447C] text-base">¥{p.amount.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-0.5">{new Date(p.created_at).toLocaleDateString('ja-JP')}</p>
              </div>
              <span className="text-xs bg-green-100 text-green-700 font-semibold px-3 py-1 rounded-full">決済完了</span>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

function PasswordChangeCard() {
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleChange = async () => {
    setMessage('')
    setError('')
    if (newPassword.length < 6) {
      setError('6文字以上で入力してください')
      return
    }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSaving(false)
    if (error) {
      setError('変更に失敗しました')
      return
    }
    setMessage('パスワードを変更しました')
    setNewPassword('')
  }

  return (
    <div className="max-w-xl mt-6">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <p className="text-sm font-semibold text-gray-700">パスワードを変更する</p>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="新しいパスワード（6文字以上）"
          className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A32D2D]/40"
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        {message && <p className="text-sm text-green-600">{message}</p>}
        <button
          onClick={handleChange}
          disabled={saving}
          className="w-full rounded-xl bg-[#0C447C] text-white font-bold py-3 hover:opacity-90 transition disabled:opacity-50"
        >
          {saving ? '変更中...' : 'パスワードを変更する'}
        </button>
      </div>
    </div>
  )
}

function StudentSettings({ studentId }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [name, setName] = useState('')
  const [furigana, setFurigana] = useState('')
  const [contact, setContact] = useState('')
  const [studyCourse, setStudyCourse] = useState('')

  useEffect(() => {
    if (!studentId) return
    let cancelled = false

    const load = async () => {
      const { data: prof } = await supabase
        .from('profiles')
        .select('name, furigana, line_id, study_course')
        .eq('id', studentId)
        .maybeSingle()

      if (cancelled) return

      if (prof) {
        setName(prof.name || '')
        setFurigana(prof.furigana || '')
        setContact(prof.line_id || '')
        setStudyCourse(prof.study_course || '')
      }

      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [studentId])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    setErrorMsg('')
    const { error } = await supabase
      .from('profiles')
      .update({
        name,
        furigana,
        line_id: contact,
        call_method: 'line',
        study_course: studyCourse || null,
      })
      .eq('id', studentId)
    if (error) {
      console.error('[student-settings] update failed:', error)
      setErrorMsg('保存に失敗しました。もう一度お試しください。')
      setSaving(false)
      return
    }
    setSaved(true)
    setSaving(false)
  }

  if (loading) {
    return <p className="text-sm text-gray-400">読み込み中...</p>
  }

  return (
    <div className="max-w-xl">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">お名前</label>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setSaved(false) }}
            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A32D2D]/40"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">フリガナ</label>
          <input
            type="text"
            value={furigana}
            onChange={(e) => { setFurigana(e.target.value); setSaved(false) }}
            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A32D2D]/40"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">学びたいコース</label>
          <select
            value={studyCourse}
            onChange={(e) => { setStudyCourse(e.target.value); setSaved(false) }}
            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#A32D2D]/40"
          >
            <option value="">選択してください</option>
            <option value="一般会話">一般会話（Step1〜5）</option>
            <option value="フリートーク入門">フリートーク入門</option>
            <option value="旅行韓国語">旅行韓国語</option>
            <option value="K-POPで韓国語">K-POPで韓国語</option>
            <option value="ドラマで韓国語">ドラマで韓国語</option>
          </select>
          <p className="text-xs text-gray-400 mt-1.5">変更するとコーチの画面にも反映されます</p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">LINE ID（任意）</label>
          <input
            type="text"
            value={contact}
            onChange={(e) => { setContact(e.target.value); setSaved(false) }}
            placeholder="例：your_line_id"
            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A32D2D]/40"
          />
          <p className="text-xs text-gray-400 mt-1.5">練習はLINE通話で行います</p>
          <p className="text-xs text-gray-500 mt-2 leading-relaxed">※ LINE IDの入力は任意です。分かる方はご記入いただくと、コーチからも友だち追加しやすくなります。分からない場合は空欄のままで大丈夫です。その場合は、練習予約画面に表示される担当コーチの「LINEで追加」ボタンから、ご自身でコーチを追加してください。</p>
        </div>

        {errorMsg && <p className="text-sm text-red-500">{errorMsg}</p>}
        {saved && <p className="text-sm text-green-600">変更を保存しました。</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-xl bg-[#A32D2D] text-white font-bold py-3 hover:bg-[#8a2525] transition disabled:opacity-50"
        >
          {saving ? '保存中...' : '変更を保存する'}
        </button>

        <p className="text-xs text-gray-400 leading-relaxed">
          ※ 担当コーチ・レッスンの曜日や時間の変更をご希望の場合は、コーチまたは運営までご連絡ください。
        </p>
      </div>
    </div>
  )
}

// practiceDays: この月の練習日(数値の配列) / startDays: この月の開始日(数値の配列)
function CalendarWidget({ practiceDays = [], startDays = [] }) {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  const monthNames = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']
  const dayNames = ['日','月','火','水','木','金','土']

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = Array(firstDay).fill(null).concat(
    Array.from({ length: daysInMonth }, (_, i) => i + 1)
  )
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-[#0C447C] text-base">{year}年 {monthNames[month]}</h3>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1">練習日<span className="inline-block w-2 h-2 rounded-full bg-[#A32D2D]"></span></span>
          <span className="flex items-center gap-1">開始日<span className="inline-block w-2 h-2 rounded-full bg-green-500"></span></span>
        </div>
      </div>
      <div className="grid grid-cols-7 text-center mb-2">
        {dayNames.map((d, i) => (
          <div key={d} className={`text-xs font-semibold pb-1 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'}`}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 text-center gap-y-1">
        {cells.map((day, i) => {
          const isToday = day === today.getDate()
          const isPractice = practiceDays.includes(day)
          const isStart = startDays.includes(day)
          const isSun = i % 7 === 0
          const isSat = i % 7 === 6
          return (
            <div key={i} className="relative flex items-center justify-center h-8">
              {day && (
                <>
                  {isToday && <span className="absolute inset-0 rounded-full bg-[#0C447C] mx-auto my-auto w-7 h-7"></span>}
                  {!isToday && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                      {isPractice && <span className="w-1 h-1 rounded-full bg-[#A32D2D]"></span>}
                      {isStart && <span className="w-1 h-1 rounded-full bg-green-500"></span>}
                    </span>
                  )}
                  <span className={`relative text-xs font-medium z-10
                    ${isToday ? 'text-white' : ''}
                    ${!isToday && isSun ? 'text-red-400' : ''}
                    ${!isToday && isSat ? 'text-blue-400' : ''}
                    ${!isToday && !isSun && !isSat ? 'text-gray-700' : ''}
                  `}>{day}</span>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)

function CheckoutForm({ amount, onSuccess, studentId, buttonLabel }) {
  const stripe = useStripe()
  const elements = useElements()
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async () => {
    if (!stripe || !elements) return
    setPaying(true)
    setError(null)

    try {
      const res = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, student_id: studentId }),
      })
      const data = await res.json()
      if (!res.ok || !data.clientSecret) {
        setError(data.error || '決済の初期化に失敗しました')
        setPaying(false)
        return
      }

      const card = elements.getElement(CardElement)
      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: { card },
      })

      if (confirmError) {
        setError(confirmError.message)
        setPaying(false)
        return
      }

      if (!paymentIntent || !paymentIntent.id) {
        setError('決済情報の取得に失敗しました')
        setPaying(false)
        return
      }

      onSuccess(paymentIntent.id)
    } catch (err) {
      setError('決済処理中にエラーが発生しました')
    } finally {
      setPaying(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="font-bold text-[#0C447C] mb-1">お支払い情報</p>
      <p className="text-sm text-gray-500 mb-4">¥{amount.toLocaleString()}</p>
      <div className="border border-gray-200 rounded-xl p-3 mb-4">
        <CardElement options={{ hidePostalCode: true, style: { base: { fontSize: '16px' } } }} />
      </div>
      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
      <button
        onClick={handleSubmit}
        disabled={!stripe || paying}
        className="w-full bg-[#A32D2D] text-white font-bold py-3 rounded-2xl hover:opacity-90 transition disabled:opacity-40"
      >
        {paying ? '処理中...' : (buttonLabel || `¥${amount.toLocaleString()} を支払う`)}
      </button>
    </div>
  )
}

function StripeCheckout({ amount, onSuccess, studentId, buttonLabel }) {
  return (
    <Elements stripe={stripePromise} options={{ locale: 'ja' }}>
      <CheckoutForm amount={amount} onSuccess={onSuccess} studentId={studentId} buttonLabel={buttonLabel} />
    </Elements>
  )
}

const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土']

// 学習コースの選択肢（設定画面と共通）
const STUDY_COURSE_OPTIONS = [
  '一般会話',
  'フリートーク入門',
  '旅行韓国語',
  'K-POPで韓国語',
  'ドラマで韓国語',
]

// 開始日の選択肢を作る。willmate準拠：2日後から最大4週間後まで。
function buildStartDateOptions() {
  const options = []
  const base = new Date()
  base.setHours(0, 0, 0, 0)
  for (let i = 2; i <= 28; i += 1) {
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i)
    options.push(d)
  }
  return options
}

// フレックスの回数（月◯回）ラベル
function flexCountLabel(frequency) {
  return { monthly4: '月4回', monthly8: '月8回', monthly12: '月12回' }[frequency] || ''
}

// フレックス予約で選べる日付：明日から1週間先まで（7日分）。
function buildFlexDateOptions() {
  const options = []
  const base = new Date()
  base.setHours(0, 0, 0, 0)
  for (let i = 1; i <= 7; i += 1) {
    options.push(new Date(base.getFullYear(), base.getMonth(), base.getDate() + i))
  }
  return options
}

function SchedulePicker({ studentId, changeContentMode = false }) {
  const [schedule, setSchedule] = useState([])
  const [coachName, setCoachName] = useState('')
  const [coachLineUrl, setCoachLineUrl] = useState('')
  const [coachId, setCoachId] = useState(null)
  const [selectedSlots, setSelectedSlots] = useState({})
  const [startDate, setStartDate] = useState(null)
  const [booking, setBooking] = useState(false)
  const [bookingError, setBookingError] = useState('')
  const [done, setDone] = useState(false)
  const [profile, setProfile] = useState(null)
  const [loadingSchedule, setLoadingSchedule] = useState(true)
  const [showChangeModal, setShowChangeModal] = useState(false)
  const [bookedSlots, setBookedSlots] = useState([])

  // ── 「内容を変えて継続」で選び直す値（固定コースのみ）──
  // null のあいだは profile の値をそのまま使う（＝通常の新規予約フローは一切変わらない）。
  const [ovCourse, setOvCourse] = useState(null)          // '10min' | '20min'
  const [ovFrequency, setOvFrequency] = useState(null)    // weekly1 / weekly2 / weekly3 / daily
  const [ovDuration, setOvDuration] = useState(null)      // 1month | 3months
  const [ovStudyCourse, setOvStudyCourse] = useState(null)

  // ── フレックス用の状態 ──
  const [ticketRemaining, setTicketRemaining] = useState(null)
  const [loadingTickets, setLoadingTickets] = useState(true)
  const [flexPurchaseDone, setFlexPurchaseDone] = useState(false)
  const [coachBookings, setCoachBookings] = useState([])
  const [flexSelected, setFlexSelected] = useState(null) // { date: Date, hour, minute }
  const [flexBooking, setFlexBooking] = useState(false)
  const [flexBookingError, setFlexBookingError] = useState('')
  const [flexBookingDone, setFlexBookingDone] = useState(false)
  const [myFlexBookings, setMyFlexBookings] = useState([])
  const [cancelingId, setCancelingId] = useState(null)
  const [cancelError, setCancelError] = useState('')

  const isFlex = profile?.plan_type === 'flex'

  // 実効値：継続モードで選び直した値があればそれを、なければ profile の値を使う。
  // 継続モードでないときは常に profile の値（後方互換）。
  const effCourse = (changeContentMode ? ovCourse : null) ?? profile?.course
  const effFrequency = (changeContentMode ? ovFrequency : null) ?? profile?.frequency
  const effDuration = (changeContentMode ? ovDuration : null) ?? profile?.duration
  const effStudyCourse = (changeContentMode ? ovStudyCourse : null) ?? profile?.study_course

  const parseDurationFromCourse = (course) => {
    if (!course) return 10
    const match = course.match(/(\d+)/)
    if (!match) return 10
    return Number(match[1]) || 10
  }

  const durationMin = parseDurationFromCourse(effCourse)

  const calcAmount = () => {
    if (!profile) return null
    const pricePerSession = effCourse === '10min' ? 800 : effCourse === '20min' ? 1600 : null
    const sessionsPerMonth = { weekly1: 4, weekly2: 8, weekly3: 12, daily: 30 }[effFrequency] || null
    if (!pricePerSession || !sessionsPerMonth) return null
    const monthly = pricePerSession * sessionsPerMonth
    return isThreeMonths(effDuration) ? Math.floor(monthly * 3 * 0.95) : monthly
  }

  // フレックスのパック金額（月4/8/12回 × 単価、3ヶ月なら5%割引）。
  // 期間は profile.duration を見る（購入画面の期間セレクタは選択時に profile.duration を更新する）。
  const calcFlexAmount = () => {
    if (!profile) return null
    const { course, frequency, duration } = profile
    const pricePerSession = course === '10min' ? 800 : course === '20min' ? 1600 : null
    const sessionsPerMonth = { monthly4: 4, monthly8: 8, monthly12: 12 }[frequency] || null
    if (!pricePerSession || !sessionsPerMonth) return null
    const monthly = pricePerSession * sessionsPerMonth
    return isThreeMonths(duration) ? Math.floor(monthly * 3 * 0.95) : monthly
  }

  const getWeeklyLimit = (frequency) => {
    return {
      weekly1: 1,
      weekly2: 2,
      weekly3: 3,
      daily: 7,
    }[frequency] || 0
  }

  const maxSelectableSlots = getWeeklyLimit(effFrequency)
  const selectedCount = Object.keys(selectedSlots).length
  const remainingSlots = Math.max(maxSelectableSlots - selectedCount, 0)
  // 契約の頻度ちょうどの枠数を選び終えているか。ここが決済に進める条件。
  const isSlotSelectionComplete = maxSelectableSlots > 0 && selectedCount === maxSelectableSlots

  const startDateOptions = buildStartDateOptions()

  // 継続モードで時間・頻度を変えたら、選択済みの枠と開始日をリセットする（枠の構造が変わるため）。
  const handleChangeCourse = (v) => { setOvCourse(v); setSelectedSlots({}); setStartDate(null) }
  const handleChangeFrequency = (v) => { setOvFrequency(v); setSelectedSlots({}); setStartDate(null) }
  const handleChangeDuration = (v) => { setOvDuration(v) }
  const handleChangeStudyCourse = (v) => { setOvStudyCourse(v) }

  // フレックス生徒の有効チケット残数を取得する
  const fetchTicketBalance = async (sid) => {
    setLoadingTickets(true)
    const todayStr = toDateKey(new Date())
    const { data, error } = await supabase
      .from('ticket_balance')
      .select('remaining, expires_at')
      .eq('student_id', sid)
    if (error) {
      console.error('[student] ticket_balance fetch failed:', error)
      setTicketRemaining(0)
      setLoadingTickets(false)
      return
    }
    const total = (data || [])
      .filter((t) => !t.expires_at || t.expires_at >= todayStr)
      .reduce((sum, t) => sum + (t.remaining || 0), 0)
    setTicketRemaining(total)
    setLoadingTickets(false)
  }

  useEffect(() => {
    if (!studentId) return
    supabase.from('profiles').select('coach_id, line_id, course, frequency, duration, plan_type, study_course').eq('id', studentId).single().then(({ data }) => {
      if (!data?.coach_id) { setLoadingSchedule(false); setLoadingTickets(false); return }
      setProfile(data)
      setCoachId(data.coach_id)
      supabase.from('coaches').select('name, line_add_url').eq('id', data.coach_id).single().then(({ data: c }) => {
        setCoachName(c?.name || '')
        setCoachLineUrl(c?.line_add_url || '')
      })
      // フレックスならチケット残数＋コーチの既存予約＋自分の予約を取得。固定なら使わないのでスキップ。
      if (data.plan_type === 'flex') {
        fetchTicketBalance(studentId)
        fetchCoachBookings(data.coach_id)
        fetchMyFlexBookings(studentId)
      } else {
        setLoadingTickets(false)
      }
      const fetchBookedSlots = async () => {
        const response = await fetch(`/api/coach-booked-slots?coachId=${data.coach_id}`)
        if (!response.ok) return
        const result = await response.json()
        setBookedSlots(result.bookedSlots || [])
      }
      fetchBookedSlots()
      supabase.from('coach_schedule').select('*').eq('coach_id', data.coach_id).eq('is_open', true).order('day_of_week').order('hour').order('minute').then(({ data: slots }) => {
        setSchedule(slots || [])
        setLoadingSchedule(false)
      })
    })
  }, [studentId])

  const GROUPED_SCHEDULE = schedule.reduce((acc, slot) => {
    const key = slot.day_of_week
    if (!acc[key]) acc[key] = []
    acc[key].push(slot)
    return acc
  }, {})

  const buildAvailableStarts = (slots = [], durationMinutes) => {
    const step = 10
    const needCount = Math.ceil(durationMinutes / step)
    const sorted = [...slots].sort((a, b) => (a.hour * 60 + a.minute) - (b.hour * 60 + b.minute))
    const openSet = new Set(sorted.map(({ hour, minute }) => `${hour}-${minute}`))

    return sorted.filter(({ hour, minute }) => {
      let currentHour = hour
      let currentMinute = minute
      for (let i = 1; i < needCount; i += 1) {
        currentMinute += step
        if (currentMinute >= 60) {
          currentHour += 1
          currentMinute -= 60
        }
        if (!openSet.has(`${currentHour}-${currentMinute}`)) {
          return false
        }
      }
      return true
    })
  }

  const toMinutes = (hour, minute) => (hour * 60) + minute

  const slotsOverlap = (aStartMin, aDurMin, bStartMin, bDurMin) => {
    const aEnd = aStartMin + (aDurMin || 0)
    const bEnd = bStartMin + (bDurMin || 0)
    return aStartMin < bEnd && bStartMin < aEnd
  }

  const isSlotBooked = (slot) => {
    if (!bookedSlots || bookedSlots.length === 0) return false
    const slotsToCheck = changeContentMode
      ? bookedSlots.filter((booking) => booking.student_id !== studentId)
      : bookedSlots
    const sStart = toMinutes(slot.hour, slot.minute)
    const sDur = durationMin
    return slotsToCheck.some((b) => {
      if (Number(b.day_of_week) !== Number(slot.day_of_week)) return false
      const bStart = toMinutes(b.hour, b.minute)
      const bDur = b.duration_min ?? durationMin
      return slotsOverlap(sStart, sDur, bStart, bDur)
    })
  }

  const availableStartsByDay = Object.fromEntries(
    Object.entries(GROUPED_SCHEDULE).map(([day, slots]) => [day, buildAvailableStarts(slots, durationMin)])
  )

  const visibleDays = Object.keys(availableStartsByDay).map((day) => Number(day)).sort((a, b) => a - b)

  

  const handleBook = async (paymentIntentId) => {
    const selectedValues = Object.values(selectedSlots)
    if (selectedValues.length === 0 || !studentId || !coachId || !paymentIntentId) return
    // 二重の安全策：頻度ちょうどの枠数がそろっていなければ予約を作らない。
    if (!isSlotSelectionComplete) {
      setBookingError(`週${maxSelectableSlots}回のプランです。${maxSelectableSlots}枠すべて選んでください。`)
      return
    }
    setBooking(true)
    setBookingError('')

    const dayOfWeekValues = [...new Set(selectedValues.map((slot) => slot.day_of_week))]

    const { data: existingBookings, error: existingError } = await supabase
      .from('lesson_bookings')
      .select('student_id, day_of_week, hour, minute, status, duration_min')
      .eq('coach_id', coachId)
      .neq('status', 'cancelled')
      .in('day_of_week', dayOfWeekValues)

    if (existingError) {
      console.error('[handleBook] existing booking check failed:', existingError)
      setBookingError('予約状況の確認に失敗しました。再度お試しください。')
      setBooking(false)
      return
    }

    // 「内容を変えて継続」で来た場合、この生徒自身の旧予約は「重複」とみなさない。
    // （このあと旧予約は自動キャンセルされるため。除外しないと、同じ曜日・時間を
    //   取り直す継続で必ず衝突し、決済だけ済んで予約が作られない事故になる。）
    const conflictCandidates = changeContentMode
      ? (existingBookings || []).filter((b) => b.student_id !== studentId)
      : (existingBookings || [])

    const conflict = conflictCandidates.find((b) => {
      return selectedValues.some((s) => {
        if (Number(s.day_of_week) !== Number(b.day_of_week)) return false
        const sStart = toMinutes(s.hour, s.minute)
        const sDur = durationMin
        const bStart = toMinutes(b.hour, b.minute)
        const bDur = b.duration_min ?? durationMin
        return slotsOverlap(sStart, sDur, bStart, bDur)
      })
    })

    if (conflict) {
      setBookingError('その時間は予約済みです')
      setBooking(false)
      return
    }

    const startDateStr = startDate ? toDateKey(startDate) : null

    const rows = selectedValues.map((slot) => ({
      student_id: studentId,
      coach_id: coachId,
      day_of_week: slot.day_of_week,
      hour: slot.hour,
      minute: slot.minute,
      duration_min: durationMin,
      method: 'LINE',
      contact: profile?.line_id || '',
      status: 'approved',
      stripe_payment_intent_id: paymentIntentId,
      start_date: startDateStr,
    }))

    const { error: insertError } = await supabase.from('lesson_bookings').insert(rows)
    if (insertError) {
      console.error('[handleBook] lesson_bookings insert failed:', insertError)
      const duplicateMessage = insertError.message?.includes('duplicate') || insertError.code === '23505'
      setBookingError(duplicateMessage ? 'その時間は予約済みです' : '予約の保存に失敗しました。')
      setBooking(false)
      return
    }

    // 「内容を変えて継続」で来た場合は、選び直した内容を profiles に反映する。
    // （通常の新規予約フローでは changeContentMode=false なので、ここは実行されない）
    if (changeContentMode) {
      const { error: profErr } = await supabase
        .from('profiles')
        .update({
          course: effCourse,
          frequency: effFrequency,
          duration: effDuration,
          study_course: effStudyCourse || null,
        })
        .eq('id', studentId)
      if (profErr) console.error('[handleBook] profile update failed:', profErr)

      // 旧契約の予約に「終了日」を入れる（即キャンセルはしない）。
      // 新しい契約（今作った予約 start_date=startDateStr）より前の開始日を持つ、
      // この生徒の固定予約（cancelled以外・終了日未設定）に end_date = 新開始日の前日 を入れる。
      // ・新契約が始まるまでは旧曜日のレッスンがコーチ・生徒の画面に表示され続ける。
      // ・終了日を過ぎた予約は、DBの定期ジョブ（毎日0:05 JST）が自動で cancelled にする。
      // ・フレックス（booking_type='flex'）は対象外。
      // ・失敗しても継続自体は成立させる（旧予約が残るだけなので、その場合は手動対応）。
      if (startDateStr) {
        const [sy, sm, sd] = startDateStr.split('-').map(Number)
        const endDateStr = toDateKey(new Date(sy, sm - 1, sd - 1))
        const { error: endOldErr } = await supabase
          .from('lesson_bookings')
          .update({ end_date: endDateStr })
          .eq('student_id', studentId)
          .neq('status', 'cancelled')
          .neq('booking_type', 'flex')
          .is('end_date', null)
          .lt('start_date', startDateStr)
        if (endOldErr) console.error('[handleBook] set end_date on old bookings failed:', endOldErr)
      }
    }

    setBooking(false)
    setDone(true)
  }

  // フレックスのパック購入が成功したとき。チケット付与はwebhookが行う（安全のためクライアントでは付与しない）。
  const handleFlexPurchaseSuccess = async () => {
    setFlexPurchaseDone(true)
  }

  // フレックスのまとめ買い期間（1ヶ月分／3ヶ月分）を選んだとき。
  // ここで profiles.duration を確定保存する。webhook は決済成功後に profiles.duration を
  // 読んでチケット枚数・有効期限を決めるため、選択時点で保存しておくことで
  // 「3ヶ月分を払ったのに8枚/30日しか付かない」というズレを防ぐ（決済時ではなく選択時に保存）。
  const handleSelectFlexDuration = async (v) => {
    if (!studentId) return
    setProfile((prev) => (prev ? { ...prev, duration: v } : prev))
    const { error } = await supabase.from('profiles').update({ duration: v }).eq('id', studentId)
    if (error) console.error('[student] flex duration update failed:', error)
  }

  // コーチの既存予約（キャンセル以外）を取得。フレックスの空き判定に使う。
  const fetchCoachBookings = async (cid) => {
    if (!cid) return
    const { data, error } = await supabase
      .from('lesson_bookings')
      .select('booking_type, booking_date, day_of_week, hour, minute, duration_min, start_date, status')
      .eq('coach_id', cid)
      .neq('status', 'cancelled')
    if (error) {
      console.error('[student] coach bookings fetch failed:', error)
      setCoachBookings([])
      return
    }
    setCoachBookings(data || [])
  }

  // 指定した日付＋開始コマが、コーチの既存予約と重なっているか。
  const isDateSlotBooked = (dateObj, slot) => {
    if (!coachBookings || coachBookings.length === 0) return false
    const dateKey = toDateKey(dateObj)
    const dow = dateObj.getDay()
    const sStart = toMinutes(slot.hour, slot.minute)
    const sDur = durationMin
    return coachBookings.some((b) => {
      const bStart = toMinutes(b.hour, b.minute)
      const bDur = b.duration_min ?? durationMin
      if (!slotsOverlap(sStart, sDur, bStart, bDur)) return false
      if (b.booking_type === 'flex') {
        // フレックス予約はその日付のみをブロック
        return b.booking_date === dateKey
      }
      // 固定予約は毎週その曜日をブロック（開始日以降）
      if (Number(b.day_of_week) !== dow) return false
      if (b.start_date && dateKey < b.start_date) return false
      return true
    })
  }

  // フレックス予約を確定する（RPCでチケット消化と予約作成を原子的に実行）
  const handleFlexBook = async () => {
    if (!flexSelected || !studentId || !coachId) return
    setFlexBooking(true)
    setFlexBookingError('')

    // 二重の安全策：直前にもう一度、重複していないか確認
    if (isDateSlotBooked(flexSelected.date, flexSelected)) {
      setFlexBookingError('その時間は予約済みです。別の時間を選んでください。')
      setFlexBooking(false)
      return
    }

    const { data, error } = await supabase.rpc('book_flex_lesson', {
      p_student_id: studentId,
      p_coach_id: coachId,
      p_booking_date: toDateKey(flexSelected.date),
      p_hour: flexSelected.hour,
      p_minute: flexSelected.minute,
      p_duration_min: durationMin,
      p_contact: profile?.line_id || '',
    })

    if (error) {
      console.error('[student] book_flex_lesson failed:', error)
      setFlexBookingError('予約に失敗しました。時間をおいて再度お試しください。')
      setFlexBooking(false)
      return
    }

    if (!data?.success) {
      setFlexBookingError(data?.error === 'no_ticket' ? '回数チケットが不足しています。' : '予約に失敗しました。')
      setFlexBooking(false)
      return
    }

    // 予約が入ったことを担当コーチへメール通知する（失敗しても予約自体は成立させる）
    try {
      await fetch('/api/notify-flex-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          coachId,
          bookingDate: toDateKey(flexSelected.date),
          hour: flexSelected.hour,
          minute: flexSelected.minute,
          durationMin,
        }),
      })
    } catch (e) {
      console.error('[handleFlexBook] notify failed:', e)
    }

    setFlexBooking(false)
    setFlexBookingDone(true)
  }

  // 自分の今後のフレックス予約を取得（キャンセル済み・過去日を除く）
  const fetchMyFlexBookings = async (sid) => {
    if (!sid) return
    const todayStr = toDateKey(new Date())
    const { data, error } = await supabase
      .from('lesson_bookings')
      .select('id, booking_date, hour, minute, duration_min, status')
      .eq('student_id', sid)
      .eq('booking_type', 'flex')
      .neq('status', 'cancelled')
      .gte('booking_date', todayStr)
      .order('booking_date', { ascending: true })
    if (error) {
      console.error('[student] my flex bookings fetch failed:', error)
      setMyFlexBookings([])
      return
    }
    setMyFlexBookings(data || [])
  }

  // レッスン開始まで5時間以上あるか（キャンセル可能か）
  const canCancelFlex = (b) => {
    if (!b?.booking_date) return false
    const [hh, mm] = [Number(b.hour) || 0, Number(b.minute) || 0]
    const parts = String(b.booking_date).split('-').map(Number)
    if (parts.length !== 3) return false
    const lessonTs = new Date(parts[0], parts[1] - 1, parts[2], hh, mm, 0)
    return lessonTs.getTime() - Date.now() >= 5 * 60 * 60 * 1000
  }

  const handleCancelFlex = async (bookingId) => {
    if (!bookingId || !studentId) return
    setCancelingId(bookingId)
    setCancelError('')

    const { data, error } = await supabase.rpc('cancel_flex_booking', {
      p_booking_id: bookingId,
      p_student_id: studentId,
    })

    if (error) {
      console.error('[student] cancel_flex_booking failed:', error)
      setCancelError('キャンセルに失敗しました。時間をおいて再度お試しください。')
      setCancelingId(null)
      return
    }

    if (!data?.success) {
      if (data?.error === 'too_late') {
        setCancelError('レッスン開始5時間前を過ぎているため、キャンセルできません。')
      } else if (data?.error === 'not_found') {
        setCancelError('対象の予約が見つかりませんでした。')
      } else {
        setCancelError('キャンセルに失敗しました。')
      }
      setCancelingId(null)
      return
    }

    setCancelingId(null)
    // 残数・予約一覧・コーチ予約を再取得
    await fetchTicketBalance(studentId)
    await fetchMyFlexBookings(studentId)
    await fetchCoachBookings(coachId)
  }

  // 予約後に残数とコーチ予約を再取得して、続けて予約できる状態に戻す
  const refreshFlexBooking = async () => {
    setFlexBookingDone(false)
    setFlexSelected(null)
    setFlexBookingError('')
    await fetchTicketBalance(studentId)
    await fetchCoachBookings(coachId)
    await fetchMyFlexBookings(studentId)
  }

  if (done) return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
      <p className="text-4xl mb-4">🎉</p>
      <p className="font-bold text-[#0C447C] text-lg mb-2">予約が確定しました！</p>
      <p className="text-sm text-gray-500">担当コーチにも通知されました。</p>
    </div>
  )

  if (flexPurchaseDone) return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
      <p className="text-4xl mb-4">🎉</p>
      <p className="font-bold text-[#0C447C] text-lg mb-2">お支払いが完了しました！</p>
      <p className="text-sm text-gray-500 mb-4">回数チケットが反映されるまで数十秒ほどかかる場合があります。</p>
      <button
        onClick={() => window.location.reload()}
        className="rounded-xl bg-[#A32D2D] text-white font-bold px-6 py-3 hover:opacity-90 transition"
      >
        予約画面へ進む
      </button>
    </div>
  )

  const coachBar = (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5 flex items-center justify-between">
      <div>
        <p className="text-xs text-gray-400 mb-0.5">担当コーチ</p>
        <p className="font-bold text-[#0C447C]">{coachName || '（読み込み中）'}</p>
      </div>
      <div className="flex flex-col items-end gap-2">
        {coachLineUrl && (
         <a  
            href={coachLineUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs bg-[#06C755] text-white rounded-lg px-3 py-1.5 font-semibold hover:opacity-90 transition"
          >
            {coachName || 'コーチ'}をLINEで追加
          </a>
        )}
        <button
          onClick={() => setShowChangeModal(true)}
          className="text-xs text-[#A32D2D] border border-[#A32D2D]/30 rounded-lg px-3 py-1.5 hover:bg-[#A32D2D]/5 transition disabled:opacity-50"
        >
          コーチを変更する
        </button>
      </div>
    </div>
  )

  const changeModal = showChangeModal && (
    <ChangeCoachModal
      studentId={studentId}
      currentCoachId={coachId}
      profile={profile}
      onClose={() => setShowChangeModal(false)}
      onDone={() => { setShowChangeModal(false); window.location.reload() }}
    />
  )

  // 「内容を変えて継続」で来たときの、レッスン時間・コース・頻度・期間を選び直すカード（固定コースのみ）。
  const selectClass = 'w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#A32D2D]/40'
  const changeContentCard = changeContentMode && !isFlex && (
    <div className="bg-[#FFF8E1] border border-[#FFE082] rounded-2xl p-5 mb-5">
      <p className="font-bold text-[#A32D2D] mb-1">内容を変えて継続</p>
      <p className="text-xs text-gray-600 mb-4">レッスン時間・学習コース・頻度・期間を選び直せます。変更すると、下の空き枠とお支払い額が自動で更新されます。</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">レッスン時間</label>
          <select value={effCourse || ''} onChange={(e) => handleChangeCourse(e.target.value)} className={selectClass}>
            <option value="10min">10分</option>
            <option value="20min">20分</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">頻度</label>
          <select value={effFrequency || ''} onChange={(e) => handleChangeFrequency(e.target.value)} className={selectClass}>
            <option value="weekly1">週1回</option>
            <option value="weekly2">週2回</option>
            <option value="weekly3">週3回</option>
            <option value="daily">毎日</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">期間</label>
          <select value={effDuration || ''} onChange={(e) => handleChangeDuration(e.target.value)} className={selectClass}>
            <option value="1month">1ヶ月</option>
            <option value="3months">3ヶ月（5%割引）</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">学習コース</label>
          <select value={effStudyCourse || ''} onChange={(e) => handleChangeStudyCourse(e.target.value)} className={selectClass}>
            <option value="">選択してください</option>
            {STUDY_COURSE_OPTIONS.map((c) => (
              <option key={c} value={c}>{c === '一般会話' ? '一般会話（Step1〜5）' : c}</option>
            ))}
          </select>
        </div>
      </div>
      {calcAmount() ? (
        <p className="text-sm font-bold text-[#0C447C] mt-4">お支払い予定額：¥{calcAmount().toLocaleString()}</p>
      ) : (
        <p className="text-xs text-yellow-700 mt-4">お支払い額を計算できません。時間・頻度・期間の組み合わせをご確認ください。</p>
      )}
    </div>
  )

  // ── フレックスコース：チケットを持っていなければ購入、持っていれば都度予約（5-bで実装） ──
  if (isFlex) {
    const flexAmount = calcFlexAmount()
    // まとめ買い期間セレクタ用の値（1ヶ月分／3ヶ月分の回数・金額・期限）。
    const flexMonthlyCount = { monthly4: 4, monthly8: 8, monthly12: 12 }[profile?.frequency] || 0
    const flexPricePerSession = profile?.course === '10min' ? 800 : profile?.course === '20min' ? 1600 : 0
    const flexMonthly = flexPricePerSession * flexMonthlyCount
    const flexOneMonthPrice = flexMonthly
    const flexThreeMonthPrice = Math.floor(flexMonthly * 3 * 0.95)
    const flexIsThree = isThreeMonths(profile?.duration)
    return (
      <div>
        {coachBar}
        {changeModal}

        {loadingTickets ? (
          <p className="text-sm text-gray-400">読み込み中...</p>
        ) : (ticketRemaining || 0) > 0 ? (
          flexBookingDone ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
              <p className="text-4xl mb-4">🎉</p>
              <p className="font-bold text-[#0C447C] text-lg mb-2">予約が確定しました！</p>
              <p className="text-sm text-gray-500 mb-4">担当コーチにも通知されました。残り {Math.max((ticketRemaining || 0) - 1, 0)} 回分の予約ができます。</p>
              <button
                onClick={refreshFlexBooking}
                className="rounded-xl bg-[#A32D2D] text-white font-bold px-6 py-3 hover:opacity-90 transition"
              >
                続けて予約する
              </button>
            </div>
          ) : (
            <div>
              <div className="bg-[#EEF4FB] border border-[#D3E2F3] rounded-2xl p-4 mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#0C447C]">フレックスコース</p>
                  <p className="text-xs text-[#0C447C]/70 mt-0.5">好きな日時を選んで予約できます（1回につき1チケット消化）。</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-extrabold text-[#0C447C] leading-none">残り{ticketRemaining}回</p>
                </div>
              </div>

              {flexBookingError && <p className="text-sm text-red-500 mb-4">{flexBookingError}</p>}

              {myFlexBookings.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
                  <p className="font-bold text-[#0C447C] text-sm mb-3">予約中のレッスン</p>
                  {cancelError && <p className="text-sm text-red-500 mb-3">{cancelError}</p>}
                  <div className="space-y-2">
                    {myFlexBookings.map((b) => {
                      const parts = String(b.booking_date).split('-').map(Number)
                      const dObj = new Date(parts[0], parts[1] - 1, parts[2])
                      const dur = b.duration_min ?? durationMin
                      const endTotal = (Number(b.hour) || 0) * 60 + (Number(b.minute) || 0) + dur
                      const endStr = `${String(Math.floor(endTotal / 60)).padStart(2,'0')}:${String(endTotal % 60).padStart(2,'0')}`
                      const cancelable = canCancelFlex(b)
                      return (
                        <div key={b.id} className="flex items-center justify-between border border-gray-100 rounded-xl px-4 py-3">
                          <div>
                            <p className="text-sm font-semibold text-gray-700">
                              {dObj.getMonth() + 1}/{dObj.getDate()}（{DAY_NAMES[dObj.getDay()]}）
                              {' '}{String(b.hour).padStart(2,'0')}:{String(b.minute).padStart(2,'0')}〜{endStr}
                            </p>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                              {b.status === 'approved' ? '確定済み' : 'コーチ確認待ち'}
                            </p>
                          </div>
                          {cancelable ? (
                            <button
                              onClick={() => handleCancelFlex(b.id)}
                              disabled={cancelingId === b.id}
                              className="text-xs text-[#A32D2D] border border-[#A32D2D]/30 rounded-lg px-3 py-1.5 hover:bg-[#A32D2D]/5 transition disabled:opacity-50"
                            >
                              {cancelingId === b.id ? 'キャンセル中...' : 'キャンセル'}
                            </button>
                          ) : (
                            <span className="text-[11px] text-gray-400 text-right leading-tight">
                              5時間前を過ぎたため<br />変更不可
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-3">キャンセルはレッスン開始の5時間前まで可能です。キャンセルすると回数が1回分戻ります。5時間を過ぎた場合は補講申請をご利用ください。</p>
                </div>
              )}

              {schedule.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 text-center">
                  <p className="text-sm text-yellow-800 font-semibold mb-1">このコーチはまだ空き時間を登録していません</p>
                  <p className="text-xs text-yellow-600">別のコーチに変更するか、コーチの登録をお待ちください。</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-500 mb-3">これから1週間の空き時間から、予約したい日時を選んでください。</p>
                  <div className="space-y-4 mb-6">
                    {buildFlexDateOptions().map((dateObj) => {
                      const dow = dateObj.getDay()
                      const daySlots = availableStartsByDay[String(dow)] || []
                      return (
                        <div key={toDateKey(dateObj)} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                          <p className="font-bold text-[#0C447C] text-sm mb-3">
                            {dateObj.getMonth() + 1}/{dateObj.getDate()}（{DAY_NAMES[dow]}）
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {daySlots.length === 0 ? (
                              <p className="text-sm text-gray-400">この日は空き時間がありません</p>
                            ) : (
                              daySlots.map((slot) => {
                                const slotKey = `${toDateKey(dateObj)}-${slot.hour}-${slot.minute}`
                                const isBooked = isDateSlotBooked(dateObj, slot)
                                const isSelected = flexSelected
                                  && toDateKey(flexSelected.date) === toDateKey(dateObj)
                                  && flexSelected.hour === slot.hour
                                  && flexSelected.minute === slot.minute
                                return (
                                  <button
                                    key={slotKey}
                                    type="button"
                                    onClick={() => {
                                      if (isBooked) return
                                      if (isSelected) {
                                        setFlexSelected(null)
                                      } else {
                                        setFlexSelected({ date: dateObj, hour: slot.hour, minute: slot.minute })
                                      }
                                    }}
                                    disabled={isBooked}
                                    className={`rounded-xl px-3 py-1.5 text-sm font-semibold border transition ${isSelected ? 'bg-[#A32D2D] text-white border-[#A32D2D]' : isBooked ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-200 hover:border-[#A32D2D]'}`}
                                  >
                                    {String(slot.hour).padStart(2,'0')}:{String(slot.minute).padStart(2,'0')}
                                    {isBooked && <span className="ml-2 text-[10px] text-gray-500">満</span>}
                                  </button>
                                )
                              })
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {flexSelected && (
                    <div className="bg-[#FFF8E1] border border-[#FFE082] rounded-2xl p-5 mb-4">
                      <p className="font-bold text-yellow-800 mb-1">選択した日時</p>
                      <p className="text-sm text-yellow-700">
                        {flexSelected.date.getMonth() + 1}月{flexSelected.date.getDate()}日（{DAY_NAMES[flexSelected.date.getDay()]}）
                        {' '}{String(flexSelected.hour).padStart(2,'0')}:{String(flexSelected.minute).padStart(2,'0')}〜
                        {(() => {
                          const endTotal = flexSelected.hour * 60 + flexSelected.minute + durationMin
                          return `${String(Math.floor(endTotal / 60)).padStart(2,'0')}:${String(endTotal % 60).padStart(2,'0')}`
                        })()}
                      </p>
                      <p className="text-xs text-yellow-600 mt-1">この予約で回数チケットを1回分消化します。</p>
                      <button
                        onClick={handleFlexBook}
                        disabled={flexBooking}
                        className="w-full mt-4 bg-[#A32D2D] text-white font-bold py-3 rounded-2xl hover:opacity-90 transition disabled:opacity-40"
                      >
                        {flexBooking ? '予約中...' : 'この日時で予約する'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )
        ) : (
          <div className="space-y-4">
            <div className="bg-[#FFF8E1] border border-[#FFE082] rounded-2xl p-5">
              <p className="font-bold text-[#A32D2D] mb-1">フレックスコース：{flexCountLabel(profile?.frequency)}パック</p>
              <p className="text-sm text-gray-600">
                回数チケットを購入すると、担当コーチの空き時間から好きな時間に予約できます（有効期限：購入から{flexIsThree ? '90日' : '30日'}）。
              </p>
            </div>

            {flexOneMonthPrice > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <p className="text-sm font-bold text-[#0C447C] mb-1">まとめ買いの期間を選ぶ</p>
                <p className="text-xs text-gray-500 mb-3">まとめて購入するほどお得です。選ぶとお支払い額が切り替わります。</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleSelectFlexDuration('1month')}
                    className={`text-left rounded-xl border p-4 transition ${!flexIsThree ? 'border-[#A32D2D] bg-[#A32D2D]/5' : 'border-gray-200 hover:border-[#A32D2D]/40'}`}
                  >
                    <p className="font-bold text-[#0C447C]">1ヶ月分</p>
                    <p className="text-sm text-gray-600 mt-1">{flexMonthlyCount}回・有効期限30日</p>
                    <p className="text-base font-extrabold text-[#0C447C] mt-1">¥{flexOneMonthPrice.toLocaleString()}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectFlexDuration('3months')}
                    className={`text-left rounded-xl border p-4 transition ${flexIsThree ? 'border-[#A32D2D] bg-[#A32D2D]/5' : 'border-gray-200 hover:border-[#A32D2D]/40'}`}
                  >
                    <p className="font-bold text-[#0C447C]">
                      3ヶ月分
                      <span className="ml-2 text-[11px] bg-[#A32D2D]/10 text-[#A32D2D] font-semibold px-2 py-0.5 rounded-full">5%お得</span>
                    </p>
                    <p className="text-sm text-gray-600 mt-1">{flexMonthlyCount * 3}回・有効期限90日</p>
                    <p className="text-base font-extrabold text-[#0C447C] mt-1">¥{flexThreeMonthPrice.toLocaleString()}</p>
                  </button>
                </div>
              </div>
            )}

            {flexAmount ? (
              <StripeCheckout
                amount={flexAmount}
                onSuccess={handleFlexPurchaseSuccess}
                studentId={studentId}
                buttonLabel={`¥${flexAmount.toLocaleString()} を支払う（${flexIsThree ? '3ヶ月分' : '1ヶ月分'}・${flexCountLabel(profile?.frequency)}）`}
              />
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-center text-sm text-yellow-700">
                部活費を計算できません。コース・回数・期間の登録情報を確認してください。
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── 固定コース ──
  return (
    <div>
      {coachBar}
      {changeModal}
      {changeContentCard}

      {loadingSchedule ? (
        <p className="text-sm text-gray-400">スケジュールを読み込み中...</p>
      ) : schedule.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 text-center">
          <p className="text-sm text-yellow-800 font-semibold mb-1">このコーチはまだ空き時間を登録していません</p>
          <p className="text-xs text-yellow-600">別のコーチに変更するか、コーチの登録をお待ちください。</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-4">空き時間から予約したい時間を選んでください。</p>
          {bookingError && <p className="text-sm text-red-500 mb-4">{bookingError}</p>}
          {maxSelectableSlots > 0 && (
            <div className="bg-[#EEF4FB] border border-[#D3E2F3] rounded-2xl p-4 mb-4">
              <p className="text-sm font-semibold text-[#0C447C]">週{maxSelectableSlots}回のプランです（{maxSelectableSlots}枠すべて選ぶと予約に進めます）</p>
              <p className="text-xs text-[#0C447C]/70 mt-1">
                {isSlotSelectionComplete
                  ? 'すべての枠を選択しました。開始日を選んでお支払いに進んでください。'
                  : `選択中 ${selectedCount} / ${maxSelectableSlots} 枠（あと${remainingSlots}枠）`}
              </p>
            </div>
          )}
          <div className="space-y-4 mb-6">
            {visibleDays.map((day) => {
              const dayKey = String(day)
              const daySlots = availableStartsByDay[dayKey] || []
              const selectedSlot = selectedSlots[dayKey]
              return (
                <div key={day} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <p className="font-bold text-[#0C447C] text-sm mb-3">{DAY_NAMES[day]}曜日</p>
                  <div className="flex flex-wrap gap-2">
                    {daySlots.length === 0 ? (
                      <p className="text-sm text-gray-400">この曜日は空き時間がありません</p>
                    ) : (
                      daySlots.map(slot => {
                        const slotWithDay = { ...slot, day_of_week: Number(day) }
                        const slotKey = `${day}-${slot.hour}-${slot.minute}`
                        const selectedStart = selectedSlot ? selectedSlot.hour * 60 + selectedSlot.minute : null
                        const slotTime = slot.hour * 60 + slot.minute
                        const isSelected = selectedStart !== null && slotTime >= selectedStart && slotTime < selectedStart + durationMin
                        const isBooked = isSlotBooked(slotWithDay)
                        const disableByLimit = !isSelected && selectedCount >= maxSelectableSlots && maxSelectableSlots > 0
                        return (
                          <button
                            key={slotKey}
                            type="button"
                            onClick={() => {
                              if (isBooked || disableByLimit) return
                              setSelectedSlots((prev) => {
                                const existing = prev[day]
                                if (existing?.hour === slot.hour && existing?.minute === slot.minute) {
                                  const next = { ...prev }
                                  delete next[day]
                                  return next
                                }
                                return { ...prev, [day]: { ...slotWithDay } }
                              })
                            }}
                            disabled={isBooked || disableByLimit}
                            className={`rounded-xl px-3 py-1.5 text-sm font-semibold border transition ${isSelected ? 'bg-[#A32D2D] text-white border-[#A32D2D]' : isBooked || disableByLimit ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-200 hover:border-[#A32D2D]'}`}
                          >
                            {String(slot.hour).padStart(2,'0')}:{String(slot.minute).padStart(2,'0')}
                            {isBooked && <span className="ml-2 text-[10px] text-gray-500">満</span>}
                            {!isBooked && disableByLimit && <span className="ml-2 text-[10px] text-gray-500">選択上限</span>}
                          </button>
                        )
                      })
                    )}
                  </div>
                  {selectedSlot && (
                    <p className="mt-3 text-sm text-[#0C447C]">選択済み: {String(selectedSlot.hour).padStart(2,'0')}:{String(selectedSlot.minute).padStart(2,'0')}〜{String((selectedSlot.hour * 60 + selectedSlot.minute + durationMin) / 60 | 0).padStart(2,'0')}:{String((selectedSlot.minute + durationMin) % 60).padStart(2,'0')}</p>
                  )}
                </div>
              )
            })}
          </div>

          {selectedCount > 0 && (
            <div className="bg-[#FFF8E1] border border-[#FFE082] rounded-2xl p-5 mb-4">
              <p className="font-bold text-yellow-800 mb-1">選択済みの時間</p>
              <div className="space-y-2 text-sm text-yellow-700">
                {Object.entries(selectedSlots).map(([day, slot]) => {
                  const start = `${String(slot.hour).padStart(2,'0')}:${String(slot.minute).padStart(2,'0')}`
                  const endTotal = slot.hour * 60 + slot.minute + durationMin
                  const endHour = Math.floor(endTotal / 60)
                  const endMin = endTotal % 60
                  const end = `${String(endHour).padStart(2,'0')}:${String(endMin).padStart(2,'0')}`
                  return (
                    <p key={day}>{DAY_NAMES[Number(day)]}曜日 {start}〜{end}</p>
                  )
                })}
              </div>
              <p className="text-xs text-yellow-600 mt-1">毎週この時間に{durationMin}分間の練習を行います</p>
            </div>
          )}

          {/* 頻度ちょうどの枠数がまだそろっていない間は、開始日・決済に進めない */}
          {selectedCount > 0 && !isSlotSelectionComplete && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-center text-sm text-yellow-700 mb-4">
              週{maxSelectableSlots}回のプランです。あと{remainingSlots}枠選んでください。
            </div>
          )}

          {isSlotSelectionComplete && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
              <p className="font-bold text-[#0C447C] mb-1">レッスン開始日</p>
              <p className="text-xs text-gray-500 mb-3">この日付以降の、選んだ曜日から練習が始まります（2日後〜4週間後から選べます）。</p>
              <div className="flex flex-wrap gap-2">
                {startDateOptions.map((d) => {
                  const key = toDateKey(d)
                  const isSelected = startDate && toDateKey(startDate) === key
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setStartDate(d)}
                      className={`rounded-xl px-3 py-1.5 text-sm font-semibold border transition ${isSelected ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-200 hover:border-green-500'}`}
                    >
                      {d.getMonth() + 1}/{d.getDate()}（{DAY_NAMES[d.getDay()]}）
                    </button>
                  )
                })}
              </div>
              {startDate && (
                <p className="mt-3 text-sm text-green-700">開始日：{startDate.getFullYear()}年{startDate.getMonth() + 1}月{startDate.getDate()}日（{DAY_NAMES[startDate.getDay()]}）</p>
              )}
            </div>
          )}

          {isSlotSelectionComplete && !startDate && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-center text-sm text-yellow-700 mb-4">
              レッスン開始日を選んでください。
            </div>
          )}

          {isSlotSelectionComplete && startDate && calcAmount() && (
            <StripeCheckout amount={calcAmount()} onSuccess={handleBook} studentId={studentId} />
          )}
          {isSlotSelectionComplete && startDate && !calcAmount() && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-center text-sm text-yellow-700">
              部活費を計算できません。コース・頻度・期間の登録情報を確認してください。
            </div>
          )}
        </>
      )}
    </div>
  )
}

function CoachList({ studentId }) {
  const [coaches, setCoaches] = useState([])
  const [loading, setLoading] = useState(true)
  const [selecting, setSelecting] = useState(null)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    supabase.from('coaches').select('id, name, photo_url, bio, tags, availability_text').eq('is_active', true).order('display_order').then(({ data }) => {
      setCoaches(data || [])
      setLoading(false)
    })
    if (studentId) {
      supabase.from('profiles').select('coach_id').eq('id', studentId).single().then(({ data }) => {
        if (data) setSelected(data.coach_id)
      })
    }
  }, [studentId])

  const handleSelect = async (coachId) => {
    if (!studentId) return
    setSelecting(coachId)
    await supabase.from('profiles').update({ coach_id: coachId }).eq('id', studentId)
    setSelected(coachId)
    setSelecting(null)
    window.location.reload()
  }

  if (loading) return <p className="text-sm text-gray-400">読み込み中...</p>
  if (coaches.length === 0) return <p className="text-sm text-gray-400">現在コーチは登録されていません</p>

  return (
    <div className="space-y-4">
      {coaches.map(coach => (
        <div key={coach.id} className={`bg-white rounded-2xl border shadow-sm p-6 ${selected === coach.id ? 'border-[#A32D2D]' : 'border-gray-100'}`}>
          <div className="flex gap-4">
            {coach.photo_url ? (
              <img src={coach.photo_url} alt={coach.name} className="w-16 h-16 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-2xl">👤</div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="font-bold text-[#0C447C] text-base">{coach.name}</h3>
                {selected === coach.id && <span className="text-[11px] bg-[#A32D2D]/10 text-[#A32D2D] font-semibold px-2 py-0.5 rounded-full">選択中</span>}
              </div>
              {coach.bio && <p className="text-sm text-gray-600 mb-2">{coach.bio}</p>}
              {coach.tags && coach.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {coach.tags.map((tag, i) => (
                    <span key={i} className="text-[11px] bg-[#0C447C]/10 text-[#0C447C] px-2 py-0.5 rounded-full">{tag}</span>
                  ))}
                </div>
              )}
              <button
                onClick={() => handleSelect(coach.id)}
                disabled={selecting === coach.id || selected === coach.id}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${selected === coach.id ? 'bg-gray-100 text-gray-400 cursor-default' : 'bg-[#A32D2D] text-white hover:opacity-90'} disabled:opacity-50`}
              >
                {selecting === coach.id ? '処理中...' : selected === coach.id ? '選択済み' : 'このコーチを選ぶ'}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// 次回練習を計算する。
// makeups: 確定済みの補講（{ student_id, original_date, confirmed_at } を含む配列）。
// ・補講で振り替えられた「元授業日(original_date)」は次回練習の候補から除外する。
// ・振替先（confirmed_at の日付）を次回練習の候補に加える。
function computeNextPractice(bookings, makeups = []) {
  const today = new Date()
  const todayDow = today.getDay()
  const todayKey = toDateKey(today)

  // 補講に振り替えられた元授業日の集合（この日付の通常レッスンは次回練習に出さない）。
  const replacedDateKeys = new Set(
    (makeups || [])
      .filter((m) => m.original_date)
      .map((m) => String(m.original_date))
  )

  let best = null

  const consider = (date, booking) => {
    if (!best || date < best.date) best = { date, booking }
  }

  for (const b of (bookings || [])) {
    // フレックスは単発予約。booking_date をそのまま次回候補にする。
    if (b.booking_type === 'flex') {
      if (!b.booking_date) continue
      const fp = String(b.booking_date).split('-').map(Number)
      if (fp.length !== 3) continue
      const fd = new Date(fp[0], fp[1] - 1, fp[2])
      if (toDateKey(fd) < todayKey) continue
      consider(fd, b)
      continue
    }
    const dow = b.day_of_week
    let diff = (dow - todayDow + 7) % 7
    if (diff === 0) {
      const h = b.hour ?? 0
      const m = b.minute ?? 0
      if (today.getHours() > h || (today.getHours() === h && today.getMinutes() >= m)) {
        diff = 7
      }
    }
    let date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + diff)

    // 開始日がある予約は、開始日以降の最初の該当曜日まで進める。
    if (b.start_date) {
      let guard = 0
      while (toDateKey(date) < b.start_date && guard < 60) {
        date = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 7)
        guard += 1
      }
    }

    // 補講に振り替えられた元授業日は、その回をスキップして次の同曜日に進める。
    let guard2 = 0
    while (replacedDateKeys.has(toDateKey(date)) && guard2 < 60) {
      date = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 7)
      guard2 += 1
    }

    consider(date, b)
  }

  // 振替先の補講（confirmed_at が今日以降）を次回練習の候補に加える。
  for (const m of (makeups || [])) {
    if (!m.confirmed_at) continue
    const cd = new Date(m.confirmed_at)
    const cdDateOnly = new Date(cd.getFullYear(), cd.getMonth(), cd.getDate())
    if (toDateKey(cdDateOnly) < todayKey) continue
    // 補講を予約風のオブジェクトにして返す（次回練習カードの時刻表示に使う）。
    const makeupBooking = {
      isMakeup: true,
      hour: cd.getHours(),
      minute: cd.getMinutes(),
      coach_id: m.coach_id,
    }
    consider(cdDateOnly, makeupBooking)
  }

  return best
}

// 固定コースの受講期間表示 ＋ 継続（更新）導線。
// ・受講期間（開始日〜最終レッスン）を常に表示。
// ・最終レッスンの2週間前〜（過ぎても継続）は継続の2択を表示：
//    「同じ内容で継続」＝曜日・時間そのままで新開始日を自動セット→正しい金額で決済→予約作成。
//    「内容を変えて継続」＝通常の練習予約フロー（onChangeContent）へ。
// ・古い予約は消さずに残す方針のため、現在の契約＝最新start_dateのグループで判定する。
function ContractStatus({ studentId, profile, bookings, onChangeContent }) {
  const [showPay, setShowPay] = useState(false)
  const [renewing, setRenewing] = useState(false)
  const [renewError, setRenewError] = useState('')
  const [renewDone, setRenewDone] = useState(false)

  if (!profile) return null
  // フレックスはチケット制（買い増しで継続）なので、この継続導線の対象外。
  if (profile.plan_type === 'flex') return null

  // 固定の有効予約（開始日つき）だけを対象にする。
  const fixedBookings = (bookings || []).filter((b) => b.booking_type !== 'flex' && b.start_date)
  if (fixedBookings.length === 0) return null

  // 現在の契約＝最新の開始日のグループ。
  const currentStart = fixedBookings.map((b) => b.start_date).sort().slice(-1)[0]
  const current = fixedBookings.filter((b) => b.start_date === currentStart)
  const coachId = current[0]?.coach_id

  const contractEnd = calcContractEndDate(currentStart, profile.duration)

  // 各曜日の最終レッスンのうち、いちばん遅い日を「受講期間の最終レッスン」とする。
  let lastLesson = null
  current.forEach((b) => {
    const d = calcLastLessonDate(currentStart, b.day_of_week, profile.duration)
    if (d && (!lastLesson || d > lastLesson)) lastLesson = d
  })

  const newStart = calcRenewalStartDate(currentStart, profile.duration)
  const amount = calcFixedAmount(profile.course, profile.frequency, profile.duration)

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const daysToLast = lastLesson ? Math.ceil((lastLesson.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)) : null
  const showCTA = daysToLast !== null && daysToLast <= 14 // 最終レッスンの2週間前〜（過ぎても表示継続）
  const ended = daysToLast !== null && daysToLast < 0

  const startObj = parseDateStr(currentStart)

  const fmt = (d) => d ? `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${DAY_NAMES[d.getDay()]}）` : '—'
  const fmtShort = (d) => d ? `${d.getMonth() + 1}/${d.getDate()}（${DAY_NAMES[d.getDay()]}）` : '—'

  // 「同じ内容で継続」：決済成功後、現在の契約と同じ曜日・時間で新start_dateの予約を作成する。
  const handleRenew = async (paymentIntentId) => {
    if (!paymentIntentId || !studentId || !coachId) return
    setRenewing(true)
    setRenewError('')

    const newStartStr = toDateKey(newStart)

    // 念のため、他の生徒が同じ枠を取っていないか確認（自分の既存予約は除外）。
    const dows = [...new Set(current.map((b) => b.day_of_week))]
    const { data: existing, error: existErr } = await supabase
      .from('lesson_bookings')
      .select('day_of_week, hour, minute, status, student_id')
      .eq('coach_id', coachId)
      .neq('status', 'cancelled')
      .in('day_of_week', dows)

    if (existErr) {
      console.error('[renew] existing check failed:', existErr)
      setRenewError('予約状況の確認に失敗しました。時間をおいて再度お試しください。')
      setRenewing(false)
      return
    }

    const conflict = (existing || [])
      .filter((b) => b.student_id !== studentId)
      .find((b) => current.some((s) =>
        Number(s.day_of_week) === Number(b.day_of_week) &&
        Number(s.hour) === Number(b.hour) &&
        Number(s.minute) === Number(b.minute)
      ))

    if (conflict) {
      setRenewError('同じ枠に別の予約が入ったため継続できませんでした。「内容を変えて継続」から別の時間をお選びください。')
      setRenewing(false)
      return
    }

    const rows = current.map((b) => ({
      student_id: studentId,
      coach_id: coachId,
      day_of_week: b.day_of_week,
      hour: b.hour,
      minute: b.minute,
      duration_min: b.duration_min,
      method: 'LINE',
      contact: profile.line_id || '',
      status: 'approved',
      stripe_payment_intent_id: paymentIntentId,
      start_date: newStartStr,
    }))

    const { error: insertError } = await supabase.from('lesson_bookings').insert(rows)
    if (insertError) {
      console.error('[renew] insert failed:', insertError)
      const dup = insertError.message?.includes('duplicate') || insertError.code === '23505'
      setRenewError(dup ? 'すでに継続の予約が登録されています。' : '予約の保存に失敗しました。')
      setRenewing(false)
      return
    }

    setRenewing(false)
    setRenewDone(true)
  }

  if (renewDone) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center mb-6 max-w-xl">
        <p className="text-4xl mb-3">🎉</p>
        <p className="font-bold text-[#0C447C] text-lg mb-2">継続の手続きが完了しました！</p>
        <p className="text-sm text-gray-500 mb-4">{fmt(newStart)}以降、これまでと同じ曜日・時間で練習が続きます。</p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-xl bg-[#A32D2D] text-white font-bold px-6 py-3 hover:opacity-90 transition"
        >
          マイページを更新する
        </button>
      </div>
    )
  }

  return (
    <div className="mb-6 max-w-xl">
      <div className={`rounded-2xl border shadow-sm p-5 ${showCTA ? 'bg-[#FFF8E1] border-[#FFE082]' : 'bg-white border-gray-100'}`}>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">受講期間</p>
        <p className="text-base font-bold text-[#0C447C]">
          {fmt(startObj)} 〜 {fmt(lastLesson)}
        </p>
        <p className="text-xs text-gray-500 mt-1">※ 最終レッスン日を表示しています。</p>

        {showCTA && (
          <div className="mt-4">
            <p className="text-sm font-bold text-[#A32D2D] mb-1">
              {ended ? '受講期間が終了しました。' : `受講期間の終わりが近づいています（あと${daysToLast}日）。`}
            </p>
            <p className="text-xs text-gray-600 mb-3">続けて受講される場合は、下からお手続きください。</p>

            {renewError && <p className="text-sm text-red-500 mb-3">{renewError}</p>}

            {!showPay ? (
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => { setShowPay(true); setRenewError('') }}
                  disabled={!amount}
                  className="flex-1 rounded-xl bg-[#A32D2D] text-white font-bold py-3 hover:opacity-90 transition disabled:opacity-40"
                >
                  同じ内容で継続する
                </button>
                <button
                  onClick={onChangeContent}
                  className="flex-1 rounded-xl bg-white border border-[#0C447C]/30 text-[#0C447C] font-bold py-3 hover:bg-[#0C447C]/5 transition"
                >
                  内容を変えて継続する
                </button>
              </div>
            ) : (
              <div>
                <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-3">
                  <p className="text-sm font-bold text-[#0C447C] mb-2">同じ内容で継続</p>
                  <div className="space-y-1 text-sm text-gray-600">
                    {current.map((b) => (
                      <p key={`${b.day_of_week}-${b.hour}-${b.minute}`}>
                        {DAY_NAMES[b.day_of_week]}曜日 {String(b.hour).padStart(2, '0')}:{String(b.minute).padStart(2, '0')}〜（{b.duration_min}分）
                      </p>
                    ))}
                  </div>
                  <p className="text-sm text-green-700 mt-2">新しい開始日：{fmt(newStart)}</p>
                  <p className="text-xs text-gray-400 mt-1">この日以降、上記の曜日・時間で練習が続きます。</p>
                  <button
                    onClick={() => setShowPay(false)}
                    className="text-xs text-gray-400 underline mt-2"
                  >
                    キャンセル
                  </button>
                </div>
                {amount ? (
                  <StripeCheckout
                    amount={amount}
                    onSuccess={handleRenew}
                    studentId={studentId}
                    buttonLabel={renewing ? '処理中...' : `¥${amount.toLocaleString()} を支払って継続する`}
                  />
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-center text-sm text-yellow-700">
                    金額を計算できませんでした。運営までお問い合わせください。
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function StudentDashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeMenu, setActiveMenu] = useState('home')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [hasBooking, setHasBooking] = useState(null)
  const [bookings, setBookings] = useState([])
  const [confirmedMakeups, setConfirmedMakeups] = useState([])
  const [coachNameMap, setCoachNameMap] = useState({})
  const [profile, setProfile] = useState(null)
  const [makeupUnreadCount, setMakeupUnreadCount] = useState(0)
  const [reviewUnreadCount, setReviewUnreadCount] = useState(0)
  // 「内容を変えて継続」で予約画面に来たかどうか。true のときだけ、予約画面に
  // レッスン時間・コース・頻度・期間の選び直しUIを出す（通常の新規予約では false）。
  const [changeContentMode, setChangeContentMode] = useState(false)

  useEffect(() => {
    const loadSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
      setUser(session.user)
      setLoading(false)
      fetchMakeupUnreadCount(session.user.id)
      supabase.from('profiles').select('coach_id, course, frequency, duration, study_course, contract_weekdays, contract_start_date, plan_type, line_id').eq('id', session.user.id).single().then(({ data }) => {
        setHasBooking(!!(data && data.coach_id))
        setProfile(data || null)
      })
      supabase
        .from('lesson_bookings')
        .select('*')
        .eq('student_id', session.user.id)
        .eq('status', 'approved')
        .then(({ data }) => {
          const list = data || []
          setBookings(list)
          const coachIds = [...new Set(list.map(b => b.coach_id).filter(Boolean))]
          if (coachIds.length > 0) {
            supabase.from('coaches').select('id, name').in('id', coachIds).then(({ data: cs }) => {
              const map = {}
              ;(cs || []).forEach(c => { map[c.id] = c.name })
              setCoachNameMap(map)
            })
          }
        })
      // 確定済みの補講（承認済み・confirmed_atあり）を取得。次回練習の振替反映に使う。
      supabase
        .from('lesson_makeup_requests')
        .select('id, coach_id, original_date, confirmed_at, status')
        .eq('student_id', session.user.id)
        .eq('status', 'approved')
        .not('confirmed_at', 'is', null)
        .then(({ data }) => {
          setConfirmedMakeups(data || [])
        })
    }
    loadSession()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const fetchMakeupUnreadCount = async (studentId) => {
    if (!studentId) return
    const { data, error } = await supabase
      .from('lesson_makeup_requests')
      .select('id')
      .eq('student_id', studentId)
      .in('status', ['approved', 'rejected'])
      .is('student_viewed_at', null)

    if (error) {
      console.error('[student] fetch makeup unread failed:', error)
      return
    }
    setMakeupUnreadCount((data || []).length)
  }

  const fetchReviewUnreadCount = async (studentId) => {
    if (!studentId) return
    const { data, error } = await supabase
      .from('reviews')
      .select('id')
      .eq('student_id', studentId)
      .is('student_viewed_at', null)

    if (error) {
      console.error('[student] fetch review unread failed:', error)
      return
    }
    setReviewUnreadCount((data || []).length)
  }

  const markReviewsAsViewed = async (studentId) => {
    if (!studentId) return
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('reviews')
      .update({ student_viewed_at: now })
      .eq('student_id', studentId)
      .is('student_viewed_at', null)

    if (error) console.error('[student] mark reviews viewed failed:', error)
  }

  const markMakeupAsViewed = async (studentId) => {
    if (!studentId) return
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('lesson_makeup_requests')
      .update({ student_viewed_at: now })
      .eq('student_id', studentId)
      .in('status', ['approved', 'rejected'])
      .is('student_viewed_at', null)

    if (error) {
      console.error('[student] mark makeup viewed failed:', error)
    }
  }

  const userId = user?.id

  useEffect(() => {
    if (!userId) return
    fetchMakeupUnreadCount(userId)
  }, [userId])

  useEffect(() => {
    if (activeMenu !== 'makeup' || !userId) return
    const markRead = async () => {
      await markMakeupAsViewed(userId)
      await fetchMakeupUnreadCount(userId)
    }
    markRead()
  }, [activeMenu, userId])

  useEffect(() => {
    if (activeMenu !== 'review' || !userId) return
    const markRead = async () => {
      await markReviewsAsViewed(userId)
      await fetchReviewUnreadCount(userId)
    }
    markRead()
  }, [activeMenu, userId])

  useEffect(() => {
    if (!userId) return
    fetchReviewUnreadCount(userId)
  }, [userId])

  const nextPractice = computeNextPractice(bookings, confirmedMakeups)

  const todayKeyForCalendar = toDateKey(new Date())

  const practiceDaysThisMonth = (() => {
    if (!bookings || bookings.length === 0) return []
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days = []
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d)
      const dateKey = toDateKey(date)
      // その日を練習日とする予約が1件でもあれば練習日。開始日より前は除外。
      const isPracticeDay = bookings.some((b) =>
        b.day_of_week === date.getDay() && isOnOrAfterStart(b, dateKey)
      )
      if (isPracticeDay) days.push(d)
    }
    return days
  })()

  const startDaysThisMonth = (() => {
    if (!bookings || bookings.length === 0) return []
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth()
    const days = new Set()
    bookings.forEach((b) => {
      if (!b.start_date) return
      const parts = String(b.start_date).split('-')
      if (parts.length !== 3) return
      const sy = Number(parts[0])
      const sm = Number(parts[1]) - 1
      const sd = Number(parts[2])
      if (sy === year && sm === month) days.add(sd)
    })
    return [...days]
  })()

  const formatCourseLabel = (course) => {
    if (course === '10min') return '10分コース'
    if (course === '20min') return '20分コース'
    return '未設定'
  }

  const formatFrequencyLabel = (frequency) => {
    if (frequency === 'weekly1') return '週1回'
    if (frequency === 'weekly2') return '週2回'
    if (frequency === 'weekly3') return '週3回'
    if (frequency === 'daily') return '毎日'
    if (frequency === 'monthly4') return '月4回'
    if (frequency === 'monthly8') return '月8回'
    if (frequency === 'monthly12') return '月12回'
    return '未設定'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-sm">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'Noto Sans KR', sans-serif" }}>
      <Head>
        <title>マイページ | 電話韓国語 チグム</title>
      </Head>

      <header className="bg-white border-b border-gray-100 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <span className="block w-5 h-0.5 bg-gray-600 mb-1"></span>
            <span className="block w-5 h-0.5 bg-gray-600 mb-1"></span>
            <span className="block w-5 h-0.5 bg-gray-600"></span>
          </button>
          <Link href="/" className="font-bold text-[#A32D2D] text-lg tracking-tight">chigum korean</Link>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:block text-xs text-gray-400">{user?.email}</span>
          <button
            onClick={handleLogout}
            className="text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition"
          >
            ログアウト
          </button>
        </div>
      </header>

      <div className="flex">
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/30 z-20 md:hidden" onClick={() => setSidebarOpen(false)} />
        )}
        <aside className={`
          fixed md:sticky top-[57px] left-0 h-[calc(100vh-57px)] w-56 bg-white border-r border-gray-100 z-20 flex flex-col
          transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
            {MENU.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'review') {
                    router.push('/review')
                    return
                  }
                  if (item.id === 'materials') {
                    router.push('/materials')
                    return
                  }
                  // メニューから練習予約に入るのは「通常の予約」なので、継続モードは必ず解除する。
                  setChangeContentMode(false)
                  setActiveMenu(item.id)
                  setSidebarOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition
                  ${activeMenu === item.id
                    ? 'bg-[#A32D2D]/10 text-[#A32D2D]'
                    : 'text-gray-600 hover:bg-gray-50'
                  }`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
                {item.id === 'makeup' && makeupUnreadCount > 0 && (
                  <span className="ml-auto min-w-[18px] h-5 px-2 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
                    {makeupUnreadCount}
                  </span>
                )}
                {item.id === 'review' && reviewUnreadCount > 0 && (
                  <span className="ml-auto min-w-[18px] h-5 px-2 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
                    {reviewUnreadCount}
                  </span>
                )}
              </button>
            ))}
          </nav>
          <div className="p-4 border-t border-gray-100">
            <p className="text-[10px] text-gray-400 text-center">電話韓国語 チグム</p>
          </div>
        </aside>

        <main className="flex-1 p-4 md:p-8 min-w-0">

          {hasBooking === false && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">👋</span>
                  <div>
                    <p className="font-bold text-yellow-800 text-sm">まずコーチを選びましょう！</p>
                    <p className="text-yellow-600 text-xs mt-0.5">コーチを選ぶと練習予約ができるようになります。</p>
                  </div>
                </div>
                <button
                  onClick={() => { setChangeContentMode(false); setActiveMenu('booking') }}
                  className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold text-xs px-4 py-2 rounded-xl transition"
                >
                  コーチを選ぶ →
                </button>
              </div>
            )}

            {activeMenu === 'home' && (
            <div className="max-w-3xl">
              <div className="mb-6">
                <h1 className="text-xl font-bold text-[#0C447C]">ホーム</h1>
                <p className="text-sm text-gray-400 mt-0.5">おかえりなさい、部員さん</p>
              </div>

              {profile && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6 max-w-xl">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">ご契約プラン</p>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <p className="text-base font-bold text-[#0C447C]">{formatCourseLabel(profile.course)}</p>
                      <p className="text-sm text-gray-500 mt-1">{formatFrequencyLabel(profile.frequency)}</p>
                      {profile.study_course && (
                        <p className="text-sm text-gray-500 mt-1">学習コース：{profile.study_course}</p>
                      )}
                    </div>
                    <div className="rounded-2xl bg-[#F8FAFC] border border-[#E5E7EB] px-4 py-3 text-sm text-gray-600">
                      <p>契約開始日</p>
                      <p className="font-semibold text-[#0C447C] mt-1">{profile.contract_start_date ? new Date(profile.contract_start_date).toLocaleDateString('ja-JP') : '未設定'}</p>
                    </div>
                  </div>
                </div>
              )}

              <ContractStatus
                studentId={user?.id}
                profile={profile}
                bookings={bookings}
                onChangeContent={() => { setChangeContentMode(true); setActiveMenu('booking') }}
              />

              {nextPractice && (
                <div className="grid grid-cols-1 gap-4 mb-6">
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 max-w-xs">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">次回練習</p>
                    <p className="text-base font-bold text-[#0C447C]">
                      {nextPractice.date.getMonth() + 1}月{nextPractice.date.getDate()}日（{DAY_NAMES[nextPractice.date.getDay()]}）
                      {nextPractice.booking.isMakeup && (
                        <span className="ml-2 text-[11px] bg-[#A32D2D]/10 text-[#A32D2D] font-bold px-2 py-0.5 rounded-full align-middle">補講</span>
                      )}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {String(nextPractice.booking.hour ?? 0).padStart(2, '0')}:{String(nextPractice.booking.minute ?? 0).padStart(2, '0')}〜
                    </p>
                    {coachNameMap[nextPractice.booking.coach_id] && (
                      <div className="mt-3">
                        <span className="inline-block text-[11px] bg-[#0C447C]/10 text-[#0C447C] font-semibold px-2 py-0.5 rounded-full">
                          コーチ：{coachNameMap[nextPractice.booking.coach_id]}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {hasBooking && !nextPractice && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6 max-w-xs">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">次回練習</p>
                  <p className="text-sm text-gray-400">確定した予約はまだありません</p>
                </div>
              )}

              {hasBooking &&
              <div className="mb-6">
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">練習カレンダー</h2>
                <CalendarWidget practiceDays={practiceDaysThisMonth} startDays={startDaysThisMonth} />
              </div>}

              <div>
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">クイックアクション</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { label: '練習を予約する', icon: '📅', menu: 'booking' },
                    { label: '教材を見る',     icon: '📚', menu: 'materials' },
                    { label: '部活費を確認',   icon: '💳', menu: 'billing' },
                  ].map((a) => (
                    <button
                      key={a.menu}
                      onClick={() => {
                        if (a.menu === 'materials') {
                          router.push('/materials')
                          return
                        }
                        // クイックアクションからの予約も通常予約なので継続モードは解除。
                        setChangeContentMode(false)
                        setActiveMenu(a.menu)
                      }}
                      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col items-center gap-2 hover:border-[#A32D2D]/30 hover:shadow-md transition text-center"
                    >
                      <span className="text-2xl">{a.icon}</span>
                      <span className="text-xs font-semibold text-gray-600">{a.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeMenu === 'booking' && (
            <div className="max-w-3xl">
              <h1 className="text-xl font-bold text-[#0C447C] mb-6">
                {hasBooking ? '練習時間を選ぶ' : 'コーチを選ぶ'}
              </h1>
              {hasBooking
                ? <SchedulePicker studentId={user?.id} changeContentMode={changeContentMode} />
                : <CoachList studentId={user?.id} />
              }
            </div>
          )}

          {activeMenu === 'settings' && (
            <div className="max-w-3xl">
              <h1 className="text-xl font-bold text-[#0C447C] mb-1">各種変更</h1>
              <p className="text-sm text-gray-400 mb-6">登録情報を変更できます</p>
              {profile && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">ご契約プラン</p>
                  <p className="text-base font-bold text-[#0C447C]">{formatCourseLabel(profile.course)}</p>
                  <p className="text-sm text-gray-500 mt-1">{formatFrequencyLabel(profile.frequency)}</p>
                </div>
              )}
              <StudentSettings studentId={user?.id} />
              <PasswordChangeCard />
            </div>
          )}

          {activeMenu === 'makeup' && (
            <div className="max-w-3xl">
              <h1 className="text-xl font-bold text-[#0C447C] mb-6">補講申請</h1>
              <MakeupRequest studentId={user?.id} />
            </div>
          )}

          {activeMenu === 'billing' && (
            <div className="max-w-3xl">
              <h1 className="text-xl font-bold text-[#0C447C] mb-6">部活費・お支払い</h1>
              <BillingTab studentId={user?.id} />
            </div>
          )}

          {!['home', 'booking', 'settings', 'billing', 'makeup'].includes(activeMenu) && (
            <div className="max-w-3xl">
              <h1 className="text-xl font-bold text-[#0C447C] mb-6">
                {MENU.find(m => m.id === activeMenu)?.label}
              </h1>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
                <p className="text-4xl mb-4">{MENU.find(m => m.id === activeMenu)?.icon}</p>
                <p className="text-gray-400 text-sm">このページは準備中です</p>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}