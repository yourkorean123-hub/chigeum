import Head from 'next/head'
import Header from '../components/Header'
import Footer from '../components/Footer'

export default function Home() {
  return (
    <div>
      <Head>
        <title>電話韓国語 チグム ～Chigeum～</title>
        <meta name="description" content="顔出し不要・電話やLINEで学べる日本向け韓国語レッスン" />
      </Head>

      <Header />

      <main className="min-h-[70vh] flex items-center">
        <div className="max-w-5xl mx-auto px-6 py-20 grid grid-cols-1 md:grid-cols-2 gap-12">
          <section className="flex flex-col justify-center">
            <h2 className="text-2xl md:text-3xl font-bold text-[#C8272D] mb-2">電話韓国語 チグム</h2>
            <p className="text-sm uppercase tracking-[0.3em] text-[#A32D2D] mb-3">지금 시작해요！</p>
            <h1 className="text-xl font-extrabold mb-4">読むだけは、もう卒業。</h1>
            <p className="text-lg text-[#0C447C] mb-1">いつか話せたらを、チグム（今）話せるに。</p>
            <p className="text-lg text-[#0C447C] mb-6">さあ、チグムで話す部活、始めよう。</p>
            <div className="flex flex-col gap-4 mb-8">
              <a href="/register" style={{ background: '#C8272D' }} className="px-6 py-3 rounded-md text-white">
                <div className="flex flex-col items-center">
                  <span className="text-base font-semibold">入部届を送る</span>
                  <span className="text-sm opacity-90">（仮入部・無料）</span>
                </div>
              </a>
              <a href="https://utage-system.com/p/D6MRCPkR1lZy" style={{ background: '#1E6BB8' }} className="px-6 py-3 rounded-md text-white">
                <div className="flex flex-col items-center">
                  <span className="text-base font-semibold">仮入部する</span>
                </div>
              </a>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 bg-white border border-obang-yellow rounded-xl shadow-sm">
                <p className="text-sm uppercase tracking-[0.2em] text-obang-red mb-2">料金</p>
                <p className="text-xl font-semibold">10分 ¥800〜スタート</p>
              </div>
              <div className="p-5 bg-white border border-obang-green rounded-xl shadow-sm">
                <p className="text-sm uppercase tracking-[0.2em] text-obang-red mb-2">練習</p>
                <p className="text-xl font-semibold">毎日 練習OK</p>
              </div>
              <div className="p-5 bg-white border border-obang-blue rounded-xl shadow-sm">
                <p className="text-sm uppercase tracking-[0.2em] text-obang-red mb-2">安心</p>
                <p className="text-xl font-semibold">顔出し 不要</p>
              </div>
            </div>
          </section>

          <section className="flex items-center justify-center">
            <div className="w-full max-w-md bg-gradient-to-br from-[#fff] to-[#f9fafb] rounded-xl shadow-lg p-6">
              <div className="text-center mb-4">
                <img
                  src="/chogori.png"
                  alt="Chogori"
                  className="w-[300px] h-[300px] rounded-full object-cover mx-auto"
                />
              </div>
              <ul className="space-y-3 text-[#0C447C]">
                <li>・顔出し不要 — 電話/LINEで完結</li>
                <li>・ネイティブ講師がマンツーマンで指導</li>
                <li>・短時間の集中レッスンで続けやすい</li>
              </ul>
            </div>
          </section>
        </div>
      </main>

      <section id="features" className="py-12 bg-gray-50">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold text-[#0C447C] mb-10">なぜ多くの人が韓国語を話せないのか？</h2>
          <div className="rounded-3xl bg-white p-8 md:p-12 shadow-lg border border-[#E5E7EB] space-y-8">
            <p className="text-gray-700 text-lg leading-relaxed">
              読み書きを頑張ってきたのに、<br />
              なぜか話せない。<br />
              その理由に、気づいていますか？
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-2xl bg-[#C8272D]/5 border border-[#C8272D]/20 py-5 px-3">
                <p className="text-sm font-semibold text-[#0C447C] mb-1 text-left">読むより</p>
                <p className="text-2xl font-extrabold text-[#A32D2D] text-right">聞く</p>
              </div>
              <div className="rounded-2xl bg-[#C8272D]/5 border border-[#C8272D]/20 py-5 px-3">
                <p className="text-sm font-semibold text-[#0C447C] mb-1 text-left">書くより</p>
                <p className="text-2xl font-extrabold text-[#A32D2D] text-right">話す</p>
              </div>
              <div className="rounded-2xl bg-[#C8272D]/5 border border-[#C8272D]/20 py-5 px-3">
                <p className="text-sm font-semibold text-[#0C447C] mb-1 text-left">覚えるより</p>
                <p className="text-2xl font-extrabold text-[#A32D2D] text-right">使う</p>
              </div>
            </div>
            <p className="text-gray-700 text-lg leading-relaxed">
              チグムは最初から<br />
              聞く力と話す力を同時に鍛えます。<br />
              <span className="font-bold text-[#C8272D]">だから、話せるようになる。</span>
            </p>
          </div>
        </div>
      </section>

      <section id="how" className="py-16">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl font-bold mb-8">入部の流れ</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="p-4 bg-white border border-gray-200 rounded-2xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-obang-red text-white flex items-center justify-center font-bold">1</div>
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-[#A32D2D] mb-1">STEP 1</div>
                  <div className="text-base font-semibold">入部届を送る</div>
                </div>
              </div>
              <div className="text-sm text-gray-600">無料・1分で完了</div>
            </div>

            <div className="p-4 bg-white border border-gray-200 rounded-2xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-obang-red text-white flex items-center justify-center font-bold">2</div>
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-[#A32D2D] mb-1">STEP 2</div>
                  <div className="text-base font-semibold">コーチを選ぶ</div>
                </div>
              </div>
              <div className="text-sm text-gray-600">好きなコーチを選択</div>
            </div>

            <div className="p-4 bg-white border border-gray-200 rounded-2xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-obang-red text-white flex items-center justify-center font-bold">3</div>
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-[#A32D2D] mb-1">STEP 3</div>
                  <div className="text-base font-semibold">練習時間を予約</div>
                </div>
              </div>
              <div className="text-sm text-gray-600">朝練・夜練 電話orLINE</div>
            </div>

            <div className="p-4 bg-white border border-gray-200 rounded-2xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-obang-red text-white flex items-center justify-center font-bold">4</div>
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-[#A32D2D] mb-1">STEP 4</div>
                  <div className="text-base font-semibold">練習開始！</div>
                </div>
              </div>
              <div className="text-sm text-gray-600">コーチから電話がかかってくる</div>
            </div>
          </div>
        </div>
      </section>

      <section id="coach" className="py-12">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl font-bold mb-6">ネイティブコーチ紹介</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-6 bg-white rounded-lg shadow-sm text-center">
              <img src="/chogori.png" alt="コーチ1先生" className="w-20 h-20 rounded-full object-cover mx-auto mb-3" />
              <div className="font-semibold">コーチ1先生</div>
              <div className="text-sm text-gray-600">初心者担当・日本語OK</div>
            </div>
            <div className="p-6 bg-white rounded-lg shadow-sm text-center">
              <img src="/chogori.png" alt="コーチ2先生" className="w-20 h-20 rounded-full object-cover mx-auto mb-3" />
              <div className="font-semibold">コーチ2先生</div>
              <div className="text-sm text-gray-600">発音指導が得意</div>
            </div>
            <div className="p-6 bg-white rounded-lg shadow-sm text-center">
              <img src="/chogori.png" alt="コーチ3先生" className="w-20 h-20 rounded-full object-cover mx-auto mb-3" />
              <div className="font-semibold">コーチ3先生</div>
              <div className="text-sm text-gray-600">会話重視の指導</div>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="py-12 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl font-bold mb-8">部活費（料金プラン）</h2>
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div className="p-6 bg-white rounded-lg shadow-sm">
              <h3 className="text-xl font-bold mb-4 text-[#A32D2D]">10分コース（¥800/回）</h3>
              <ul className="space-y-3 text-sm">
                <li>・<span className="font-semibold">週1回プラン：¥3,200/月</span>（月4回）</li>
                <li>・<span className="font-semibold">週3回プラン：¥9,600/月</span>（月12回）<span className="ml-2 inline-block bg-[#A32D2D] text-white px-2 py-0.5 rounded text-xs">★人気No.1</span></li>
                <li>・<span className="font-semibold">毎日プラン：¥24,000/月</span>（月30回）</li>
              </ul>
            </div>
            <div className="p-6 bg-white rounded-lg shadow-sm">
              <h3 className="text-xl font-bold mb-4 text-[#A32D2D]">20分コース（¥1,600/回）</h3>
              <ul className="space-y-3 text-sm">
                <li>・<span className="font-semibold">週1回プラン：¥6,400/月</span>（月4回）</li>
                <li>・<span className="font-semibold">週2回プラン：¥12,800/月</span>（月8回）</li>
                <li>・<span className="font-semibold">週3回プラン：¥19,200/月</span>（月12回）</li>
              </ul>
            </div>
          </div>
          <div className="text-center text-sm text-gray-600 bg-blue-50 p-4 rounded-lg">
            <p>※3ヶ月まとめ申し込みで5%割引</p>
          </div>
        </div>
      </section>

      <section id="testimonials" className="py-12">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl font-bold mb-6">部員の声</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-6 bg-white rounded-lg shadow-sm">
              <div className="text-yellow-400 text-lg mb-2">★★★★★</div>
              <p className="text-sm text-gray-800">あっという間の時間で、楽しかったです。先生がすごく褒めてくださるので、気落ちすることなくお話させて頂きました。</p>
              <div className="text-sm text-gray-600 mt-3">50代・東京</div>
            </div>
            <div className="p-6 bg-white rounded-lg shadow-sm">
              <div className="text-yellow-400 text-lg mb-2">★★★★★</div>
              <p className="text-sm text-gray-800">楽しかったです！合ってるかな。。これでいいかな。。とどうしても考えちゃうので止まっちゃいますが、これは慣れていかないと仕方ないかなと。先生が親切なので、楽しいです。</p>
              <div className="text-sm text-gray-600 mt-3">40代・奈良</div>
            </div>
            <div className="p-6 bg-white rounded-lg shadow-sm">
              <div className="text-yellow-400 text-lg mb-2">★★★★★</div>
              <p className="text-sm text-gray-800">へジョンコーチ大好きなので頑張ります！</p>
              <div className="text-sm text-gray-600 mt-3">50代・島根</div>
            </div>
            <div className="p-6 bg-white rounded-lg shadow-sm">
              <div className="text-yellow-400 text-lg mb-2">★★★★★</div>
              <p className="text-sm text-gray-800">楽しいです！続けたい✨ 韓国語で話す時間が長いと、とても楽しいです（20分体験者）</p>
              <div className="text-sm text-gray-600 mt-3">40代・香川</div>
            </div>
            <div className="p-6 bg-white rounded-lg shadow-sm">
              <div className="text-yellow-400 text-lg mb-2">★★★★★</div>
              <p className="text-sm text-gray-800">はじめは緊張して聞き取れないところが多々あったし、ど忘れして返答できなかったりもしましたが、だんだん慣れてきて話せてきました✨</p>
              <div className="text-sm text-gray-600 mt-3">50代・福島</div>
            </div>
            <div className="p-6 bg-white rounded-lg shadow-sm">
              <div className="text-yellow-400 text-lg mb-2">★★★★★</div>
              <p className="text-sm text-gray-800">やっぱり会話する機会を作って話していくってすっごく大事なんだな～って痛感してます！最初の緊張がなくなってきて話せるようになってきました＾＾</p>
              <div className="text-sm text-gray-600 mt-3">50代・大阪</div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold">지금 시작해요！</h2>
        </div>
      </section>

      <section id="cta" className="py-12 bg-[#C8272D]">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <div className="flex flex-col gap-4 justify-center items-center">
            <a className="max-w-xs w-full bg-white text-[#C8272D] px-8 py-4 rounded-md font-semibold hover:opacity-90 transition border-2 border-white" href="/register">
              <div className="flex flex-col items-center">
                <span className="text-base font-semibold">入部届を送る</span>
                <span className="text-sm opacity-90">（仮入部・無料）</span>
              </div>
            </a>
            <a className="max-w-xs w-full bg-blue-500 text-white px-8 py-4 rounded-md font-semibold hover:bg-blue-600 transition" href="https://utage-system.com/p/D6MRCPkR1lZy">
              <div className="flex flex-col items-center">
                <span className="text-base font-semibold">仮入部する</span>
              </div>
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
