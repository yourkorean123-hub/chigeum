import Head from 'next/head'
import Header from '../components/Header'
import Footer from '../components/Footer'

const ROWS = [
  {
    label: '販売事業者',
    content: `Yourkorean`,
  },
  {
    label: '運営統括責任者',
    content: `岡崎 恵子`,
  },
  {
    label: '所在地',
    content: `〒640-8323 和歌山県和歌山市古屋67-5`,
  },
  {
    label: 'メールアドレス',
    content: `hanlingal-kankaiwa@yourkorean.com`,
  },
  {
    label: 'ホームページ',
    content: `https://www.chigum.jp`,
  },
  {
    label: '販売価格',
    content: `【固定コース】
・10分コース：¥800 / 回
・20分コース：¥1,600 / 回

【フレックスコース】（回数制・チケットパック）
・10分コース：¥800 / 回（月4回・8回・12回のパック）
・20分コース：¥1,600 / 回（月4回・8回・12回のパック）

3ヶ月まとめ申し込みで5%割引が適用されます。
各コースの詳細はホームページの料金プランをご確認ください。`,
  },
  {
    label: '商品代金以外の必要料金',
    content: `・銀行振込をご希望の場合：振込手数料
・インターネット接続料金、通信料金等はお客様のご負担となります。`,
  },
  {
    label: 'お支払い方法',
    content: `クレジットカード決済
※クレジットカードをお持ちでない場合は、お問い合わせフォームよりご連絡ください。銀行振込先をご案内いたします。`,
  },
  {
    label: 'お支払い時期',
    content: `・クレジットカード決済：お申し込み時
・銀行振込をご希望の場合：ご案内後、指定の期日までにご入金ください。`,
  },
  {
    label: 'サービスの提供時期',
    content: `・固定コース：ご予約いただいた曜日・時間より練習を開始します。
・フレックスコース：ご購入いただいた回数チケットで、担当コーチの空き時間からご予約いただいた日時に練習を提供します。
決済完了後、ご予約が確定し、マイページからご確認いただけます。`,
  },
  {
    label: 'チケットの有効期限（フレックスコース）',
    content: `フレックスコースの回数チケットの有効期限は、ご購入日から30日間です。期限を過ぎた未使用分は失効し、返金の対象外となります。`,
  },
  {
    label: 'キャンセル・返品について',
    content: `役務（レッスン）の性質上、購入後のお客様都合による返金は原則として行いません。

【固定コース】
練習日時にご都合がつかない場合は、マイページの「補講申請」より別日時への振替をお申し込みいただけます。

【フレックスコース】
ご予約のキャンセルは、レッスン開始の5時間前まで可能です。5時間前までにキャンセルされた場合、消化した回数（チケット）が1回分戻ります。5時間前を過ぎた場合はキャンセルできず、「補講申請」より振替をご相談いただけます。

当サービスの責に帰すべき事由による場合は、この限りではありません。`,
  },
  {
    label: '中途解約について',
    content: `退部をご希望の場合は、お問い合わせフォームよりお申し出ください。毎月のお支払い日の前日までにお申し出いただいた場合、翌月以降のサービス提供および利用料金の請求を停止いたします。`,
  },
  {
    label: '表現および商品に関する注意書き',
    content: `本サービスに示された表現や効果には個人差があり、必ずしも学習効果を保証したものではございません。`,
  },
]

export default function Tokushoho() {
  return (
    <div style={{ fontFamily: "'Noto Sans KR', sans-serif" }}>
      <Head>
        <title>特定商取引法に基づく表記 | 電話韓国語 チグム</title>
        <meta name="description" content="電話韓国語 チグムの特定商取引法に基づく表記です。" />
      </Head>
      <Header />

      <main className="min-h-[80vh] bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-6">
          <div className="mb-10">
            <p className="text-sm uppercase tracking-[0.3em] text-[#A32D2D] mb-3">LEGAL</p>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#0C447C] mb-3">特定商取引法に基づく表記</h1>
            <p className="text-sm text-gray-500">最終更新日：2026年8月8日</p>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <dl>
              {ROWS.map((row, i) => (
                <div key={i} className={`flex flex-col sm:flex-row ${i !== 0 ? 'border-t border-gray-100' : ''}`}>
                  <dt className="sm:w-52 flex-shrink-0 bg-gray-50 px-5 py-4 text-sm font-bold text-[#0C447C]">
                    {row.label}
                  </dt>
                  <dd className="flex-1 px-5 py-4 text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                    {row.content}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <p className="text-center text-xs text-gray-400 mt-8">以上</p>
        </div>
      </main>

      <Footer />
    </div>
  )
}