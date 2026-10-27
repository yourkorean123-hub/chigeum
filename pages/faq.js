import Head from 'next/head'
import Header from '../components/Header'
import Footer from '../components/Footer'

const FAQS = [
  {
    q: '顔出しは必要ですか？電話番号は使いますか？',
    a: `顔出しは不要です。練習はすべてLINEの音声通話で行います。カメラをオンにする必要はありません。
また、電話番号を使った通話は行いません。LINEのみでご利用いただけます。`,
  },
  {
    q: '「固定コース」と「フレックスコース」の違いは？',
    a: `【固定コース】
毎週決まった曜日・時間に練習するコースです。生活リズムに練習を組み込みたい方におすすめです。

【フレックスコース】
回数チケットを購入し、担当コーチの空き時間から都合の良い日時を毎回予約するコースです。曜日や時間が週によって変わる方におすすめです。`,
  },
  {
    q: '料金はいくらですか？',
    a: `【固定コース】
・10分コース：¥800 / 回
・20分コース：¥1,600 / 回

【フレックスコース】（回数制・チケットパック）
・10分コース：¥800 / 回（月4回・8回・12回のパック）
・20分コース：¥1,600 / 回（月4回・8回・12回のパック）

3ヶ月まとめてのお申し込みで5%割引が適用されます。
詳しい料金プランはホームページの料金表をご確認ください。`,
  },
  {
    q: '支払い方法は？',
    a: `クレジットカード決済のみとなります。
クレジットカードをお持ちでない場合は、お問い合わせフォームよりご連絡ください。銀行振込先をご案内いたします。`,
  },
  {
    q: '予約はどうやってしますか？',
    a: `ログイン後、マイページから予約できます。

【固定コース】
担当コーチの空いている曜日・時間から、練習したい枠を選んで予約します。

【フレックスコース】
担当コーチの空き時間から、練習したい日時を選んで予約します。予約1回につきチケットを1回分消化します。`,
  },
  {
    q: '予約はすぐに確定しますか？',
    a: `はい、予約はその場で確定します。コーチの承認を待つ必要はありません。
予約が確定すると、担当コーチにも自動で通知されます。`,
  },
  {
    q: 'コーチは選べますか？変更できますか？',
    a: `ご入部時に担当コーチをお選びいただけます。
入部後にコーチを変更したい場合は、マイページの「コーチを変更する」より、他のコーチへ変更できます。`,
  },
  {
    q: 'キャンセルや補講はできますか？',
    a: `【固定コース】
練習日時にご都合がつかない場合は、マイページの「補講申請」より別日時への振替をお申し込みいただけます。

【フレックスコース】
レッスン開始の5時間前までキャンセルできます。5時間前までにキャンセルすると、消化したチケットが1回分戻ります。5時間前を過ぎるとキャンセルはできませんが、「補講申請」より振替をご相談いただけます。`,
  },
  {
    q: '教材は有料ですか？',
    a: `教材はすべて無料でご利用いただけます。
一般会話（Step1〜5）、フリートーク入門、旅行韓国語、K-POPで韓国語、ドラマで韓国語の5コース・全174レッスンの教材をご用意しています。`,
  },
  {
    q: 'コースは途中で変更できますか？',
    a: `学習コース（一般会話・旅行韓国語など）はマイページから変更いただけます。
固定コースとフレックスコースの切り替えや、レッスン時間（10分・20分）の変更をご希望の場合は、お問い合わせフォームよりご連絡ください。`,
  },
  {
    q: '練習を始めるには何が必要ですか？',
    a: `LINEアプリが使えるスマートフォンがあれば始められます。
練習時間になると、担当コーチからLINE通話がかかってきます。事前にコーチとLINEで友だちになっておいてください。`,
  },
  {
    q: '退部したいときはどうすればいいですか？',
    a: `退部をご希望の場合は、お問い合わせフォームよりお申し出ください。
毎月のお支払い日の前日までにお申し出いただいた場合、翌月以降のサービス提供および利用料金の請求を停止いたします。`,
  },
]

export default function FAQ() {
  return (
    <div style={{ fontFamily: "'Noto Sans KR', sans-serif" }}>
      <Head>
        <title>よくある質問 | 電話韓国語 チグム</title>
        <meta name="description" content="電話韓国語 チグムのよくある質問（FAQ）です。" />
      </Head>
      <Header />

      <main className="min-h-[80vh] bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-6">
          <div className="mb-10">
            <p className="text-sm uppercase tracking-[0.3em] text-[#A32D2D] mb-3">FAQ</p>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#0C447C] mb-3">よくある質問</h1>
            <p className="text-sm text-gray-500">ご不明な点は、お問い合わせフォームよりお気軽にご連絡ください。</p>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            {FAQS.map((item, i) => (
              <details key={i} className={`group ${i !== 0 ? 'border-t border-gray-100' : ''}`}>
                <summary className="flex items-start justify-between gap-4 px-5 py-4 cursor-pointer list-none">
                  <span className="text-sm font-bold text-[#0C447C] leading-relaxed">{item.q}</span>
                  <span className="flex-shrink-0 mt-0.5 text-[#A32D2D] transition-transform group-open:rotate-45 text-lg leading-none">+</span>
                </summary>
                <div className="px-5 pb-5 -mt-1 text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                  {item.a}
                </div>
              </details>
            ))}
          </div>

          <p className="text-center text-xs text-gray-400 mt-8">以上</p>
        </div>
      </main>

      <Footer />
    </div>
  )
}