import Head from 'next/head'
import Link from 'next/link'
import Header from '../components/Header'
import Footer from '../components/Footer'

export default function CoachRecruit() {
  return (
    <div>
      <Head>
        <title>ネイティブコーチ募集 | 電話韓国語 チグム</title>
        <meta name="description" content="電話韓国語 チグムでは韓国語ネイティブのコーチを募集しています。自宅からスキマ時間に働けます。" />
      </Head>

      <Header />

      <main className="min-h-[80vh] bg-gray-50 py-16">
        <div className="max-w-2xl mx-auto px-6">

          <div className="mb-10 text-center">
            <p className="text-sm uppercase tracking-[0.3em] text-[#A32D2D] mb-4">COACH WANTED</p>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#0C447C] mb-3">ネイティブコーチ募集</h1>
            <p className="text-lg text-[#C8272D] font-semibold">韓国語を日本人に教えませんか？</p>
          </div>

          <div className="space-y-6">

            <div className="rounded-3xl bg-white p-8 shadow-lg border border-[#E5E7EB]">
              <h2 className="text-xl font-bold text-[#C8272D] mb-4">こんな方を募集しています</h2>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-[#C8272D] font-bold mt-0.5">・</span>
                  <span>韓国語ネイティブの方</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#C8272D] font-bold mt-0.5">・</span>
                  <span>日本語が話せる方（日常会話レベルでOK）</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#C8272D] font-bold mt-0.5">・</span>
                  <span>明るく親切に教えられる方</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#C8272D] font-bold mt-0.5">・</span>
                  <span>スマホ・LINEが使える方</span>
                </li>
              </ul>
            </div>

            <div className="rounded-3xl bg-white p-8 shadow-lg border border-[#E5E7EB]">
              <h2 className="text-xl font-bold text-[#0C447C] mb-4">お仕事内容</h2>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-[#0C447C] font-bold mt-0.5">・</span>
                  <span>電話またはLINE通話で韓国語レッスン</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#0C447C] font-bold mt-0.5">・</span>
                  <span>1回10分〜20分</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#0C447C] font-bold mt-0.5">・</span>
                  <span>顔出し不要</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#0C447C] font-bold mt-0.5">・</span>
                  <span>自宅から作業OK</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#0C447C] font-bold mt-0.5">・</span>
                  <span>スキマ時間に働ける</span>
                </li>
              </ul>
            </div>

            <div className="rounded-3xl bg-[#C8272D]/5 border border-[#C8272D]/20 p-8">
              <h2 className="text-xl font-bold text-[#C8272D] mb-3">応募方法</h2>
              <p className="text-gray-700">詳細はお問い合わせページからご連絡ください。</p>
            </div>

            <div className="text-center pt-2">
              <Link href="/contact" className="inline-block rounded-2xl bg-[#C8272D] px-12 py-4 text-white text-lg font-semibold transition hover:opacity-90">
                応募する
              </Link>
            </div>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
