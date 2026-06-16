import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { name, furigana, email, callMethod, contact, course, frequency, duration } = req.body

  const courseLabel = course === '10min' ? '10分コース（¥800/回）' : '20分コース（¥1,600/回）'
  const frequencyLabel = { weekly1: '週1回', weekly2: '週2回', weekly3: '週3回', daily: '毎日' }[frequency] || frequency
  const durationLabel = duration === '1month' ? '1ヶ月' : '3ヶ月（5%割引）'
  const discount = duration === '3months' ? '※ 3ヶ月プランのため5%割引が適用されます。' : ''

  try {
    // 管理者への通知メール
    await resend.emails.send({
      from: 'チグム <noreply@yourkorean.com>',
      to: 'hanlingal-kankaiwa@yourkorean.com',
      subject: `【新規入部届】${name}さんから申し込みがありました`,
      html: `
        <h2>新規入部届が届きました</h2>
        <table style="border-collapse:collapse;width:100%">
          <tr><td style="padding:8px;border:1px solid #ddd;background:#f5f5f5;width:140px"><b>お名前</b></td><td style="padding:8px;border:1px solid #ddd">${name}（${furigana}）</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;background:#f5f5f5"><b>メールアドレス</b></td><td style="padding:8px;border:1px solid #ddd">${email}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;background:#f5f5f5"><b>通話方法</b></td><td style="padding:8px;border:1px solid #ddd">${callMethod === 'phone' ? '一般電話' : 'LINE通話'}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;background:#f5f5f5"><b>連絡先</b></td><td style="padding:8px;border:1px solid #ddd">${contact}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;background:#f5f5f5"><b>希望コース</b></td><td style="padding:8px;border:1px solid #ddd">${courseLabel}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;background:#f5f5f5"><b>練習頻度</b></td><td style="padding:8px;border:1px solid #ddd">${frequencyLabel}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;background:#f5f5f5"><b>申し込み期間</b></td><td style="padding:8px;border:1px solid #ddd">${durationLabel}</td></tr>
        </table>
        ${discount ? `<p style="color:#c8272d;margin-top:16px">${discount}</p>` : ''}
      `
    })

    // 生徒への確認メール
    await resend.emails.send({
      from: 'チグム <noreply@yourkorean.com>',
      to: email,
      subject: '【チグム】入部届を受け付けました',
      html: `
        <p>${name} 様</p>
        <p>この度はチグムにお申し込みいただきありがとうございます。<br>以下の内容で入部届を受け付けました。</p>
        <table style="border-collapse:collapse;width:100%;max-width:500px">
          <tr><td style="padding:8px;border:1px solid #ddd;background:#f5f5f5;width:140px"><b>希望コース</b></td><td style="padding:8px;border:1px solid #ddd">${courseLabel}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;background:#f5f5f5"><b>練習頻度</b></td><td style="padding:8px;border:1px solid #ddd">${frequencyLabel}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;background:#f5f5f5"><b>申し込み期間</b></td><td style="padding:8px;border:1px solid #ddd">${durationLabel}</td></tr>
        </table>
        ${discount ? `<p style="color:#c8272d">${discount}</p>` : ''}
        <p>担当者より24時間以内にご連絡いたします。<br>ご不明な点はお気軽にお問い合わせください。</p>
        <p>チグム運営チーム</p>
      `
    })

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'メール送信に失敗しました' })
  }
}