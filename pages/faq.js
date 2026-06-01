import { useState } from 'react'
import Head from 'next/head'
import Header from '../components/Header'
import Footer from '../components/Footer'

const FAQ_DATA = [
  {
    category: '入部について',
    icon: '🏃',
    items: [
      {
        q: '入部方法は？',
        a: 'トップページまたは入部届ページから「入部届を送る」ボタンをクリックし、フォームをご入力ください。担当者より24時間以内にご連絡いたします。入会金・手続き費用は一切かかりません。',
      },
      {
        q: '無料体験（仮入部）はありますか？',
        a: 'はい、あります。まずは仮入部として1回無料で練習を体験していただけます。コーチとの相性や練習スタイルを確認してから正式入部をご検討ください。',
      },
      {
        q: '途中でコーチを変更できますか？',
        a: 'はい、いつでも変更可能です。コーチとの相性や学習スタイルの違いなど、どんな理由でも遠慮なくお申し出ください。マイページまたはお問い合わせよりご連絡ください。',
      },
    ],
  },
  {
    category: '練習について',
    icon: '📞',
    items: [
      {
        q: '電話とLINEどちらで練習しますか？',
        a: '入部時にご希望の通話方法をお選びいただけます。一般電話（携帯・固定）またはLINE通話から選択可能です。後から変更することもできます。顔出しは不要で、音声のみでの練習となります。',
      },
      {
        q: '欠席した場合はどうなりますか？',
        a: '練習の24時間前までにご連絡いただければ、補講クーポンを1枚発行します。補講クーポンは翌月末まで有効で、別の日程での振り替え練習にご利用いただけます。無断欠席の場合はクーポンの発行はできませんのでご注意ください。',
      },
      {
        q: '朝練・夜練の時間帯は？',
        a: 'コーチによって対応時間が異なります。早朝（8:00〜）から深夜（23:00まで）の幅広い時間帯に対応しているコーチが在籍しています。ご希望の時間帯に合うコーチをマイページからご確認ください。',
      },
    ],
  },
  {
    category: '部活費（料金）について',
    icon: '💴',
    items: [
      {
        q: '部活費はいくらですか？',
        a: '10分コースは1回¥800、20分コースは1回¥1,600です。月の練習回数に応じてお支払いいただきます。例：10分コース・週1回の場合は月額¥3,200、週3回の場合は月額¥9,600となります。',
      },
      {
        q: '3ヶ月まとめ申し込みの割引はありますか？',
        a: 'はい、3ヶ月分をまとめてお申し込みいただくと5%割引が適用されます。長期的に継続して学習したい方におすすめです。',
      },
      {
        q: '支払い方法は？',
        a: '銀行振込・クレジットカード・PayPayなど各種お支払い方法に対応しています。詳細はご入部後のご案内をご確認ください。',
      },
    ],
  },
  {
    category: '教材について',
    icon: '📚',
    items: [
      {
        q: '教材は別途購入が必要ですか？',
        a: 'いいえ、必要ありません。チグムオリジナルの教材を無料でご利用いただけます。マイページの「教材」メニューからいつでもアクセスできます。',
      },
      {
        q: 'どんな教材がありますか？',
        a: '「一般会話 Step 1〜5」「フリートーク入門」「旅行韓国語」「K-POPで韓国語」「ドラマで韓国語」の5コースをご用意しています。各課にはキーフレーズ・単語リスト・会話・練習問題・ポイント解説が含まれており、音声読み上げ機能（韓国語 ko-KR）にも対応しています。',
      },
    ],
  },
]

function AccordionItem({ question, answer }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-start justify-between gap-4 py-4 text-left"
      >
        <span className="text-sm font-semibold text-gray-800 leading-relaxed">{question}</span>
        <span className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-transform duration-200 mt-0.5
          ${open ? 'border-[#A32D2D] text-[#A32D2D] rotate-45' : 'border-gray-300 text-gray-400'}`}>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
          </svg>
        </span>
      </button>
      {open && (
        <p className="text-sm text-gray-600 leading-relaxed pb-4 pr-10">{answer}</p>
      )}
    </div>
  )
}

export default function FAQ() {
  return (
    <div style={{ fontFamily: "'Noto Sans KR', sans-serif" }}>
      <Head>
        <title>よくある質問（FAQ） | 電話韓国語 チグム</title>
        <meta name="description" content="電話韓国語 チグムのよくある質問。入部・練習・部活費・教材について詳しく説明しています。" />
      </Head>
      <Header />

      <main className="min-h-[80vh] bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-6">
          <div className="mb-10 text-center">
            <p className="text-sm uppercase tracking-[0.3em] text-[#A32D2D] mb-3">FAQ</p>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#0C447C] mb-3">よくある質問</h1>
            <p className="text-gray-500 text-sm">ご不明な点はお気軽にお問い合わせください。</p>
          </div>

          <div className="space-y-5">
            {FAQ_DATA.map((cat, i) => (
              <div key={i} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-4 bg-[#0C447C]/5 border-b border-gray-100">
                  <span className="text-xl">{cat.icon}</span>
                  <h2 className="font-bold text-[#0C447C] text-base">{cat.category}</h2>
                </div>
                <div className="px-6">
                  {cat.items.map((item, j) => (
                    <AccordionItem key={j} question={item.q} answer={item.a} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 mb-3">解決しない場合はお問い合わせください</p>
            <a href="/contact" className="inline-block rounded-2xl bg-[#A32D2D] px-8 py-3 text-white text-sm font-semibold hover:opacity-90 transition">
              お問い合わせへ
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
