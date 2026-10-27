import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const resendApiKey = process.env.RESEND_API_KEY
const resendFrom = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
const resend = resendApiKey ? new Resend(resendApiKey) : null

// サーバー側でだけ使う管理用クライアント（RLSを越えてコーチ・生徒の情報を読む）
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const admin = (supabaseUrl && serviceRoleKey) ? createClient(supabaseUrl, serviceRoleKey) : null

const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土']

// 'YYYY-MM-DD' を「◯月◯日（曜）」の表示に変換する
function formatBookingDate(dateStr) {
  if (!dateStr) return ''
  const parts = String(dateStr).split('-').map(Number)
  if (parts.length !== 3) return dateStr
  const d = new Date(parts[0], parts[1] - 1, parts[2])
  return `${parts[1]}月${parts[2]}日（${DAY_NAMES[d.getDay()]}）`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { studentId, coachId, bookingDate, hour, minute, durationMin } = req.body || {}
  if (!studentId || !coachId || !bookingDate) {
    return res.status(400).json({ error: 'Missing studentId, coachId or bookingDate' })
  }

  if (!resend || !admin) {
    // メールが送れない設定でも、予約自体は成立させたいのでエラーにはしない
    return res.status(200).json({ success: false, skipped: true })
  }

  try {
    // コーチの名前を取得
    const { data: coach } = await admin
      .from('coaches')
      .select('name')
      .eq('id', coachId)
      .maybeSingle()

    // コーチのメールは auth.users から取得
    const { data: coachAuth } = await admin.auth.admin.getUserById(coachId)
    const coachEmail = coachAuth?.user?.email || null

    // 生徒の名前とLINE IDを取得
    const { data: student } = await admin
      .from('profiles')
      .select('name, line_id')
      .eq('id', studentId)
      .maybeSingle()

    if (!coachEmail) {
      // コーチのメールが未登録なら送らずに終了（予約は成立済み）
      return res.status(200).json({ success: false, noEmail: true })
    }

    const studentName = student?.name || '生徒'
    const studentLine = student?.line_id || ''
    const dur = Number(durationMin) || 10
    const h = Number(hour) || 0
    const m = Number(minute) || 0
    const startStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    const endTotal = h * 60 + m + dur
    const endStr = `${String(Math.floor(endTotal / 60)).padStart(2, '0')}:${String(endTotal % 60).padStart(2, '0')}`
    const dateLabel = formatBookingDate(bookingDate)

    await resend.emails.send({
      from: `チグム <${resendFrom}>`,
      to: [coachEmail],
      subject: '【チグム】フレックスの予約が入りました',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="height: 6px; background: linear-gradient(to right, #e74c3c, #e67e22, #f1c40f, #2ecc71, #3498db, #9b59b6);"></div>
          <div style="background: #ffffff; padding: 32px;">
            <h1 style="font-size: 20px; color: #222; margin: 0 0 16px;">${coach?.name || ''} コーチ</h1>
            <p style="color: #555; line-height: 1.7; margin: 0 0 20px;">
              <strong>${studentName}</strong> さんが、フレックスコースのレッスンを予約しました。
            </p>
            <div style="background: #f6faff; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
              <p style="margin: 0 0 8px; color: #222; font-weight: bold;">予約日時</p>
              <p style="margin: 0 0 16px; color: #333; line-height: 1.8; font-size: 17px;">${dateLabel} ${startStr}〜${endStr}</p>
              <p style="margin: 0 0 4px; color: #222; font-weight: bold;">生徒さんのLINE ID</p>
              <p style="margin: 0; color: #333;">${studentLine || '（未登録）'}</p>
            </div>
            <p style="color: #555; line-height: 1.7; margin: 0 0 8px;">
              前日までにLINEで友だち追加とごあいさつを済ませ、当日はコーチからLINE通話をおかけください。
            </p>
            <p style="color: #555; line-height: 1.7; margin: 0 0 20px;">
              予約内容はマイページの「週間スケジュール」からもご確認いただけます。
            </p>
            <a href="https://chigum.jp/login" style="display: inline-block; background: linear-gradient(to right, #3498db, #2ecc71); color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-size: 15px; font-weight: bold;">
              マイページを開く →
            </a>
          </div>
          <div style="height: 6px; background: linear-gradient(to right, #e74c3c, #e67e22, #f1c40f, #2ecc71, #3498db, #9b59b6);"></div>
        </div>
      `,
    })

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('[notify-flex-booking] error:', error)
    // メール失敗でも予約は成立済みなので、致命的にはしない
    return res.status(200).json({ success: false, error: error?.message || 'Unknown error' })
  }
}