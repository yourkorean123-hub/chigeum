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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { studentId, newCoachId } = req.body || {}
  if (!studentId || !newCoachId) {
    return res.status(400).json({ error: 'Missing studentId or newCoachId' })
  }

  if (!resend || !admin) {
    // メールが送れない設定でも、変更自体は成立させたいのでエラーにはしない
    return res.status(200).json({ success: false, skipped: true })
  }

  try {
    // 新コーチの名前を取得
    const { data: coach } = await admin
      .from('coaches')
      .select('name')
      .eq('id', newCoachId)
      .maybeSingle()

    // 新コーチのメールは auth.users から取得
    const { data: coachAuth } = await admin.auth.admin.getUserById(newCoachId)
    const coachEmail = coachAuth?.user?.email || null

    // 生徒の名前を取得
    const { data: student } = await admin
      .from('profiles')
      .select('name')
      .eq('id', studentId)
      .maybeSingle()

    // 新コーチで今入っている予約（approved）を取得
    const { data: bookings } = await admin
      .from('lesson_bookings')
      .select('day_of_week, hour, minute, start_date, status')
      .eq('coach_id', newCoachId)
      .eq('student_id', studentId)
      .eq('status', 'approved')
      .order('day_of_week')

    if (!coachEmail) {
      // コーチのメールが未登録なら送らずに終了（変更は成立済み）
      return res.status(200).json({ success: false, noEmail: true })
    }

    const studentName = student?.name || '生徒'
    const slotLines = (bookings || [])
      .map((b) => `${DAY_NAMES[b.day_of_week]}曜日 ${String(b.hour).padStart(2, '0')}:${String(b.minute).padStart(2, '0')}`)
      .join('<br>')
    const startDate = bookings?.[0]?.start_date || '未設定'

    await resend.emails.send({
      from: `チグム <${resendFrom}>`,
      to: [coachEmail],
      subject: '【チグム】新しい担当生徒が追加されました',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="height: 6px; background: linear-gradient(to right, #e74c3c, #e67e22, #f1c40f, #2ecc71, #3498db, #9b59b6);"></div>
          <div style="background: #ffffff; padding: 32px;">
            <h1 style="font-size: 20px; color: #222; margin: 0 0 16px;">${coach.name} コーチ</h1>
            <p style="color: #555; line-height: 1.7; margin: 0 0 20px;">
              <strong>${studentName}</strong> さんが、あなたの担当生徒になりました。
            </p>
            <div style="background: #f6faff; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
              <p style="margin: 0 0 8px; color: #222; font-weight: bold;">練習時間</p>
              <p style="margin: 0 0 16px; color: #333; line-height: 1.8;">${slotLines || '（時間情報なし）'}</p>
              <p style="margin: 0 0 4px; color: #222; font-weight: bold;">開始日</p>
              <p style="margin: 0; color: #333;">${startDate}</p>
            </div>
            <p style="color: #555; line-height: 1.7; margin: 0 0 20px;">
              マイページのスケジュールからご確認いただけます。
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
    console.error('[notify-coach-change] error:', error)
    // メール失敗でも変更は成立済みなので、致命的にはしない
    return res.status(200).json({ success: false, error: error?.message || 'Unknown error' })
  }
}