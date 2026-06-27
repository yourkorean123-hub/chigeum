import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAdmin = serviceRoleKey && supabaseUrl
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null

const resendApiKey = process.env.RESEND_API_KEY
const resendFrom = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
const resendNotifyEmail = process.env.RESEND_CC_EMAIL || 'hanlingal-kankaiwa@yourkorean.com'
const resend = resendApiKey ? new Resend(resendApiKey) : null

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { name, email, message } = req.body || {}

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  // 1. データベースに保存
  if (supabaseAdmin) {
    const { error } = await supabaseAdmin
      .from('inquiries')
      .insert({ name, email, message })
    if (error) {
      console.error('[submit-inquiry] insert failed:', error)
    }
  }

  // 2. 管理者へメール通知
  if (resend) {
    try {
      await resend.emails.send({
        from: `チグム <${resendFrom}>`,
        to: [resendNotifyEmail],
        replyTo: email,
        subject: `【チグム】お問い合わせが届きました（${name}様）`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="height: 6px; background: linear-gradient(to right, #e74c3c, #e67e22, #f1c40f, #2ecc71, #3498db, #9b59b6);"></div>
            <div style="background: #ffffff; padding: 32px;">
              <h1 style="font-size: 20px; color: #222; margin: 0 0 24px;">新しいお問い合わせ</h1>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #888; font-size: 13px; width: 120px; vertical-align: top;">お名前</td>
                  <td style="padding: 8px 0; color: #222;">${name}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #888; font-size: 13px; vertical-align: top;">メール</td>
                  <td style="padding: 8px 0; color: #222;">${email}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #888; font-size: 13px; vertical-align: top;">内容</td>
                  <td style="padding: 8px 0; color: #222; white-space: pre-wrap; line-height: 1.7;">${message}</td>
                </tr>
              </table>
              <p style="color: #aaa; font-size: 12px; margin: 24px 0 0;">
                このメールに返信すると、お客様（${email}）へ直接返信できます。
              </p>
            </div>
            <div style="height: 6px; background: linear-gradient(to right, #e74c3c, #e67e22, #f1c40f, #2ecc71, #3498db, #9b59b6);"></div>
          </div>
        `,
      })
    } catch (error) {
      console.error('[submit-inquiry] email failed:', error)
    }
  }

  return res.status(200).json({ success: true })
}