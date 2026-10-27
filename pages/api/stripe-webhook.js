import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const resendApiKey = process.env.RESEND_API_KEY
const resendFrom = process.env.RESEND_FROM_EMAIL || 'noreply@yourkorean.com'
const resend = resendApiKey ? new Resend(resendApiKey) : null

// duration文字列が3ヶ月契約かどうか。DB・UIでは '3months'（複数形）を使うが、
// 過去データや手動修正で '3month'（単数形）が混じっても3ヶ月として扱う（表記ゆれ対策）。
function isThreeMonths(duration) {
  return duration === '3months' || duration === '3month'
}

export const config = {
  api: {
    bodyParser: false,
  },
}

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const sig = req.headers['stripe-signature']
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  let event

  try {
    const rawBody = await getRawBody(req)
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
  } catch (err) {
    console.error('[stripe-webhook] 署名検証エラー:', err.message)
    return res.status(400).json({ error: `Webhook Error: ${err.message}` })
  }

  console.log('[stripe-webhook] イベント受信:', event.type)

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object
    const studentId = paymentIntent.metadata?.student_id || null
    const paymentDate = new Date(paymentIntent.created * 1000).toISOString()

    const { error: paymentError } = await supabase.from('payments').insert({
      student_id: studentId,
      stripe_payment_intent_id: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: 'succeeded',
    })

    if (paymentError) {
      console.error('[stripe-webhook] DB保存エラー:', paymentError)
    }

    // ── フレックスコースのチケット付与 ──
    // flex の決済は「回数パック購入」であり予約を伴わない。
    // 決済成功時に frequency から1ヶ月あたりの回数を算出し、duration（1ヶ月/3ヶ月）を
    // 掛けた枚数を ticket_balance に付与する。
    // ・1ヶ月パック : 月回数 × 1 枚、有効期限 +30日
    // ・3ヶ月パック : 月回数 × 3 枚、有効期限 +90日（24枚を90日有効の1レコードで持たせる）
    let isFlexPurchase = false
    if (studentId) {
      const { data: studentProfile, error: studentProfileError } = await supabase
        .from('profiles')
        .select('plan_type, frequency, duration')
        .eq('id', studentId)
        .single()

      if (studentProfileError) {
        console.error('[stripe-webhook] 生徒プロフィール取得エラー:', studentProfileError)
      } else if (studentProfile?.plan_type === 'flex') {
        isFlexPurchase = true
        const monthlyCount = { monthly4: 4, monthly8: 8, monthly12: 12 }[studentProfile.frequency] || 0
        const months = isThreeMonths(studentProfile.duration) ? 3 : 1
        const ticketCount = monthlyCount * months
        const expiryDays = months * 30

        if (ticketCount > 0) {
          const expiresAt = new Date(paymentIntent.created * 1000)
          expiresAt.setDate(expiresAt.getDate() + expiryDays)
          const expiresAtDate = expiresAt.toISOString().slice(0, 10)

          const { error: ticketError } = await supabase.from('ticket_balance').insert({
            student_id: studentId,
            remaining: ticketCount,
            expires_at: expiresAtDate,
          })

          if (ticketError) {
            console.error('[stripe-webhook] チケット付与エラー:', ticketError)
          } else {
            console.log('[stripe-webhook] チケット付与成功:', studentId, ticketCount, '回 期限:', expiresAtDate, `(${months}ヶ月パック)`)
          }
        } else {
          console.error('[stripe-webhook] フレックスだが回数が算出できません frequency:', studentProfile.frequency)
        }

        // contract_start_date を決済日で初期化（未設定時のみ）
        const { error: flexProfileUpdateError } = await supabase
          .from('profiles')
          .update({ contract_start_date: paymentDate })
          .eq('id', studentId)
          .is('contract_start_date', null)

        if (flexProfileUpdateError) {
          console.error('[stripe-webhook] contract_start_date 更新エラー(flex):', flexProfileUpdateError)
        }
      }
    }

    // フレックス購入は予約を伴わないため、以降の予約取得・メール送信をスキップ
    if (isFlexPurchase) {
      console.log('[stripe-webhook] フレックス購入のため予約処理をスキップ')
      return res.status(200).json({ received: true })
    }

    const bookings = await fetchBookingsWithRetry(paymentIntent.id)
    console.log('[stripe-webhook] 予約件数:', bookings.length)

    const bookingSummary = buildBookingSummary(bookings)

    const studentIds = [...new Set(bookings.map((row) => row.student_id).filter(Boolean))]
    const coachIds = [...new Set(bookings.map((row) => row.coach_id).filter(Boolean))]

    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', [...new Set([...studentIds, ...coachIds])])

    if (profileError) {
      console.error('[stripe-webhook] プロフィール取得エラー:', profileError)
    }

    const { data: coaches, error: coachError } = await supabase
      .from('coaches')
      .select('id, name')
      .in('id', coachIds)

    if (coachError) {
      console.error('[stripe-webhook] コーチ取得エラー:', coachError)
    }

    const profileMap = Object.fromEntries((profiles || []).map((profile) => [profile.id, profile]))
    const coachMap = Object.fromEntries((coaches || []).map((coach) => [coach.id, coach]))

    const studentEmailEntries = await Promise.all(
      studentIds.map(async (id) => ({
        id,
        email: await getAuthUserEmailById(id),
      }))
    )
    const studentEmailMap = Object.fromEntries(
      studentEmailEntries.filter((item) => item.email).map((item) => [item.id, item.email])
    )

    const coachEmailEntries = await Promise.all(
      coachIds.map(async (id) => ({
        id,
        email: await getAuthUserEmailById(id),
      }))
    )
    const coachEmailMap = Object.fromEntries(
      coachEmailEntries.filter((item) => item.email).map((item) => [item.id, item.email])
    )

    console.log('[stripe-webhook] 生徒メール:', JSON.stringify(studentEmailMap))
    console.log('[stripe-webhook] コーチメール:', JSON.stringify(coachEmailMap))

    if (!resend) {
      console.error('[stripe-webhook] RESEND_API_KEY が未設定です')
    } else {
      await sendBookingEmails({
        bookingSummary,
        bookings,
        profileMap,
        studentEmailMap,
        coachEmailMap,
        coachMap,
      })
    }

    if (studentId) {
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ contract_start_date: paymentDate })
        .eq('id', studentId)
        .is('contract_start_date', null)

      if (profileUpdateError) {
        console.error('[stripe-webhook] contract_start_date 更新エラー:', profileUpdateError)
      }
    }
  }

  return res.status(200).json({ received: true })
}

async function fetchBookingsWithRetry(paymentIntentId, maxAttempts = 6, intervalMs = 2000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { data, error } = await supabase
      .from('lesson_bookings')
      .select('student_id, coach_id, day_of_week, hour, minute, duration_min')
      .eq('stripe_payment_intent_id', paymentIntentId)

    if (error) {
      console.error('[stripe-webhook] 予約検索エラー:', error.message)
    }

    if (data && data.length > 0) {
      console.log('[stripe-webhook] 予約取得成功 試行:', attempt, '件数:', data.length)
      return data
    }

    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs))
    }
  }

  console.error('[stripe-webhook] 予約が見つかりませんでした:', paymentIntentId)
  return []
}

function buildBookingSummary(bookings) {
  if (!bookings || bookings.length === 0) return null

  const dayNames = ['日', '月', '火', '水', '木', '金', '土']
  const durationMin = bookings[0].duration_min
  const courseLabel = durationMin === 20 ? '20分コース' : '10分コース'

  const grouped = bookings.reduce((acc, booking) => {
    const time = `${String(booking.hour).padStart(2, '0')}:${String(booking.minute).padStart(2, '0')}`
    const key = `${booking.day_of_week}-${time}`
    acc[key] = { day: booking.day_of_week, time }
    return acc
  }, {})

  const entries = Object.values(grouped).sort((a, b) => a.day - b.day || a.time.localeCompare(b.time))
  const dayGroups = {}

  entries.forEach(({ day, time }) => {
    if (!dayGroups[time]) dayGroups[time] = []
    dayGroups[time].push(day)
  })

  const parts = Object.entries(dayGroups).map(([time, days]) => {
    const sortedDays = days.sort((a, b) => a - b).map((day) => dayNames[day])
    const [hour, minute] = time.split(':').map(Number)
    const endTotal = hour * 60 + minute + durationMin
    const endHour = Math.floor(endTotal / 60)
    const endMinute = endTotal % 60
    const endTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`
    return `毎週 ${sortedDays.join('・')} ${time}〜${endTime}`
  })

  return `${parts.join(' / ')} (${courseLabel})`
}

async function sendBookingEmails({ bookingSummary, bookings, profileMap, studentEmailMap, coachEmailMap, coachMap }) {
  if (!bookingSummary || bookings.length === 0) {
    console.error('[stripe-webhook] 予約情報がないためメール送信をスキップ')
    return
  }

  const studentId = bookings[0].student_id
  const coachId = bookings[0].coach_id
  const student = profileMap[studentId] || {}
  const coachProfile = profileMap[coachId] || {}
  const coach = coachMap[coachId] || coachProfile || {}
  const durationMin = bookings[0].duration_min
  const courseLabel = durationMin === 20 ? '20分コース' : '10分コース'

  const coachHtml = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="padding: 24px; background: #ffffff;">
        <h1 style="font-size: 22px; color: #222; margin-bottom: 16px;">新しい予約が入りました</h1>
        <p style="color: #333; font-size: 15px; line-height: 1.7; margin-bottom: 16px;">以下の内容で予約が入りました。</p>
        <table style="width: 100%; border-collapse: collapse; font-size: 15px; color: #333;">
          <tr><td style="padding: 8px 0; width: 120px; color: #666;">生徒名</td><td style="padding: 8px 0;">${student.name || '未登録'}</td></tr>
          <tr><td style="padding: 8px 0; color: #666;">予約日時</td><td style="padding: 8px 0;">${bookingSummary}</td></tr>
          <tr><td style="padding: 8px 0; color: #666;">コース</td><td style="padding: 8px 0;">${courseLabel}</td></tr>
        </table>
        <p style="color: #888; font-size: 13px; margin-top: 24px;">このメールは自動送信です。</p>
      </div>
    </div>
  `

  const studentHtml = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="padding: 24px; background: #ffffff;">
        <h1 style="font-size: 22px; color: #222; margin-bottom: 16px;">予約が確定しました</h1>
        <p style="color: #333; font-size: 15px; line-height: 1.7; margin-bottom: 16px;">以下の内容で予約を受け付けました。</p>
        <table style="width: 100%; border-collapse: collapse; font-size: 15px; color: #333;">
          <tr><td style="padding: 8px 0; width: 120px; color: #666;">担当コーチ</td><td style="padding: 8px 0;">${coach.name || '未登録'}</td></tr>
          <tr><td style="padding: 8px 0; color: #666;">予約日時</td><td style="padding: 8px 0;">${bookingSummary}</td></tr>
          <tr><td style="padding: 8px 0; color: #666;">コース</td><td style="padding: 8px 0;">${courseLabel}</td></tr>
        </table>
        <p style="color: #888; font-size: 13px; margin-top: 24px;">このメールは自動送信です。</p>
      </div>
    </div>
  `

  const emails = []
  const coachEmail = coachEmailMap[coachId]
  const studentEmail = studentEmailMap[studentId]
  if (coachEmail) {
    emails.push({
      to: [coachEmail],
      subject: '【チグム】新しい予約通知',
      html: coachHtml,
    })
  }
  if (studentEmail) {
    emails.push({
      to: [studentEmail],
      subject: '【チグム】予約完了のお知らせ',
      html: studentHtml,
    })
  }

  if (emails.length === 0) {
    console.error('[stripe-webhook] 送信先メールアドレスがありません coachId:', coachId, 'studentId:', studentId)
    return
  }

  for (const emailData of emails) {
    try {
      const result = await resend.emails.send({
        from: `チグム <${resendFrom}>`,
        ...emailData,
      })
      if (result?.error) {
        console.error('[stripe-webhook] Resendエラー:', emailData.to, JSON.stringify(result.error))
      } else {
        console.log('[stripe-webhook] 送信成功:', emailData.to, result?.data?.id)
      }
    } catch (err) {
      console.error('[stripe-webhook] メール送信例外:', emailData.to, err)
    }
  }
}

async function getAuthUserEmailById(userId) {
  if (!userId) return null

  try {
    const { data, error } = await supabase.auth.admin.getUserById(userId)
    if (error) {
      console.error('[stripe-webhook] auth.users 取得エラー:', userId, error.message)
      return null
    }
    return data?.user?.email || null
  } catch (err) {
    console.error('[stripe-webhook] auth.users 取得例外:', userId, err)
    return null
  }
}