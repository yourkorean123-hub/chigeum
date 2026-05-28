import Head from 'next/head'
import Link from 'next/link'
import Header from '../../components/Header'
import Footer from '../../components/Footer'

export default function ContactComplete() {
  return (
    <div>
      <Head>
        <title>お問い合わせ受付完了 | 電話韓国語 チグム</title>
        <meta name="description" content="お問い合わせを受け付けました。担当者からのご連絡をお待ちください。" />
      </Head>

      <Header />

      <main className="min-h-[70vh] flex items-center justify-center bg-gray-50 py-16">
        <div className="max-w-2xl mx-auto px-6 w-full">
          <div className="rounded-3xl bg-white p-12 shadow-lg border border-[#E5E7EB] text-center">
            <div className="mb-8">
              <div className="w-24 h-24 rounded-full bg-[#C8272D]/10 flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-[#C8272D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-[#C8272D] mb-4">
                お問い合わせありがとうございます！
              </h1>
            </div>

            <div className="rounded-2xl bg-[#C8272D]/5 border border-[#C8272D]/20 p-8 mb-8">
              <svg className="w-6 h-6 text-[#1E6BB8] mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-800 font-semibold">
                担当者より24時間以内にご連絡いたします。
              </p>
            </div>

            <Link href="/" className="inline-block rounded-2xl bg-[#C8272D] px-8 py-4 text-white text-lg font-semibold transition hover:opacity-90">
              トップページに戻る
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
