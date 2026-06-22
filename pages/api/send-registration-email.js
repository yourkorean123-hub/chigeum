import { Resend } from 'resend'

const resendApiKey = process.env.RESEND_API_KEY
const resendFrom = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
const resendCcEmail = process.env.RESEND_CC_EMAIL || 'hanlingal-kankaiwa@yourkorean.com'

const resend = resendApiKey ? new Resend(resendApiKey) : null

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, name } = req.body || {}

  if (!email || !name) {
    return res.status(400).json({ error: 'Missing email or name' })
  }

  if (!resend) {
    return res.status(500).json({
      error: 'RESEND_API_KEY is not configured'
    })
  }

  try {
    const recipients = [email]
    if (resendCcEmail) recipients.push(resendCcEmail)

    await resend.emails.send({
      from: `チグム <${resendFrom}>`,
      to: recipients,
      subject: '【チグム】登録が完了しました🎉',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          
          <!-- 虹色バー -->
          <div style="height: 6px; background: linear-gradient(to right, #e74c3c, #e67e22, #f1c40f, #2ecc71, #3498db, #9b59b6);"></div>
          
          <!-- ヘッダー -->
          <div style="background: #ffffff; padding: 40px 32px 24px;">
            <h1 style="font-size: 24px; color: #222; margin: 0 0 8px;">チグム</h1>
            <p style="font-size: 13px; color: #888; margin: 0;">電話韓国語サービス</p>
          </div>

          <!-- メイン -->
          <div style="background: #f9f9f9; padding: 32px;">
            <p style="font-size: 18px; color: #222; margin: 0 0 16px;">
              <strong>${name} さん</strong>、ご登録ありがとうございます！🎉
            </p>
            <p style="color: #555; line-height: 1.7; margin: 0 0 24px;">
              チグムへようこそ。以下のステップでレッスンを始めましょう。
            </p>

            <!-- ステップ -->
            <div style="background: #fff; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
              <p style="margin: 0 0 16px; color: #222;">
                <span style="display: inline-block; width: 24px; height: 24px; background: #e74c3c; color: #fff; border-radius: 50%; text-align: center; line-height: 24px; font-size: 13px; margin-right: 8px;">1</span>
                <strong>ログイン</strong>する
              </p>
              <p style="margin: 0 0 16px; color: #222;">
                <span style="display: inline-block; width: 24px; height: 24px; background: #f1c40f; color: #fff; border-radius: 50%; text-align: center; line-height: 24px; font-size: 13px; margin-right: 8px;">2</span>
                <strong>コーチを選ぶ</strong>
              </p>
              <p style="margin: 0; color: #222;">
                <span style="display: inline-block; width: 24px; height: 24px; background: #2ecc71; color: #fff; border-radius: 50%; text-align: center; line-height: 24px; font-size: 13px; margin-right: 8px;">3</span>
                <strong>レッスン開始！</strong>🇰🇷
              </p>
            </div>

            <!-- ボタン -->
            <a href="https://chigum.jp/login" style="display: inline-block; background: linear-gradient(to right, #3498db, #2ecc71); color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: bold;">
              ログインする →
            </a>
          </div>

          <!-- フッター -->
          <div style="padding: 24px 32px; text-align: center;">
            <p style="color: #aaa; font-size: 12px; margin: 0;">
              ご不明な点は <a href="mailto:hanlingal-kankaiwa@yourkorean.com" style="color: #3498db;">hanlingal-kankaiwa@yourkorean.com</a> までお問い合わせください。
            </p>
          </div>

          <!-- 虹色バー -->
          <div style="height: 6px; background: linear-gradient(to right, #e74c3c, #e67e22, #f1c40f, #2ecc71, #3498db, #9b59b6);"></div>

        </div>
      `,
    });

    const externalResponse = await fetch('https://utage-system.com/r/ztLfbPHWf5vz/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ mail: email, name }),
    })

    if (!externalResponse.ok) {
      console.warn('External registration endpoint responded with non-OK status:', externalResponse.status)
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Resend error:', error)
    return res.status(500).json({
      error: 'Failed to send registration email',
      details: error?.message || 'Unknown error'
    })
  }
}