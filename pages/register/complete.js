import Head from 'next/head'
import Link from 'next/link'
import Header from '../../components/Header'
import Footer from '../../components/Footer'

export default function RegisterComplete() {
  return (
    <div>
      <Head>
        <title>入部届受付完了 | 電話韓国語 チグム</title>
        <meta name="description" content="入部届を受け付けました。メールをご確認のうえ、さっそく練習を始めましょう！" />
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
              <h1 className="text-4xl md:text-5xl font-extrabold text-[#C8272D] mb-4">
                入部届を受け付けました！
              </h1>
              <p className="text-lg text-gray-700 mb-2">
                ご登録ありがとうございます。
              </p>
              <p className="text-lg text-gray-700">
                ご不明な点やご質問はお気軽にお問い合わせください。
              </p>
            </div>

            <div className="rounded-2xl bg-[#C8272D]/5 border border-[#C8272D]/20 p-8 mb-8">
              <div className="text-4xl mb-3">🎉</div>
              <p className="text-gray-800 font-semibold mb-2">
                ようこそ、チグムへ！
              </p>
              <p className="text-sm text-gray-600">
                韓国語の旅、いよいよスタートです。<br />メールをご確認のうえ、さっそく練習を始めましょう！
              </p>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                それでは、チグム（今）から始まる韓国語学習をお楽しみください！
              </p>
              <Link href="/" className="inline-block rounded-2xl bg-[#C8272D] px-8 py-4 text-white text-lg font-semibold transition hover:opacity-90">
                トップページに戻る
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
