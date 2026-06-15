import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, name } = req.body;

  try {
    await resend.emails.send({
      from: 'チグム <hanlingal-kankaiwa@yourkorean.com>',
      to: [email, 'hanlingal-kankaiwa@yourkorean.com'],
      subject: '【チグム】登録が完了しました',
      html: `
        <p>${name} さん、登録ありがとうございます！</p>
        <p>チグムへようこそ。ログインしてコーチを選んでください。</p>
        <p><a href="https://chigum.jp/login">ログインはこちら</a></p>
      `,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Resend error:', error);
    return res.status(500).json({ error: error.message });
  }
}