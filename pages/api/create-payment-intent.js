import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { amount, student_id } = req.body

    // 金額のバリデーション（不正な値を防ぐ）
    if (!amount || typeof amount !== 'number' || amount < 50) {
      return res.status(400).json({ error: '金額が不正です' })
    }

    // PaymentIntent を作成（日本円・都度払い）
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount),
      currency: 'jpy',
      automatic_payment_methods: { enabled: true },
      metadata: {
        student_id: student_id || '',
      },
    })

    res.status(200).json({ clientSecret: paymentIntent.client_secret })
  } catch (err) {
    console.error('[create-payment-intent] error:', err)
    res.status(500).json({ error: '決済処理の初期化に失敗しました' })
  }
}