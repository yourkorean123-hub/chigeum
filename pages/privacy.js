import Head from 'next/head'
import Header from '../components/Header'
import Footer from '../components/Footer'

const SECTIONS = [
  {
    title: '1. 事業者情報',
    content: `電話韓国語 チグム（以下「当サービス」といいます）は、個人情報保護法をはじめとする関連法令を遵守し、お預かりする個人情報の適切な取り扱いに努めます。`,
  },
  {
    title: '2. 取得する個人情報',
    content: `当サービスでは、以下の個人情報を取得することがあります。
・お名前（フリガナ含む）
・メールアドレス
・電話番号
・LINE ID
・お支払い情報
・練習の記録・レビュー情報
・お問い合わせ内容
・ウェブサイトへのアクセス情報（クッキー等）`,
  },
  {
    title: '3. 個人情報の利用目的',
    content: `取得した個人情報は、以下の目的で利用します。
・サービスの提供・運営
・コーチとの練習予約・スケジュール管理
・部活費の請求・決済処理
・お問い合わせへの対応
・サービス改善・新機能の開発
・ご案内・お知らせの送付（ご同意いただいた場合）
・利用規約違反への対応`,
  },
  {
    title: '4. 個人情報の第三者提供',
    content: `当サービスは、以下の場合を除き、取得した個人情報を第三者に提供しません。
・ご本人の同意がある場合
・法令に基づく場合（裁判所・行政機関からの要請等）
・サービス提供に必要な業務委託先に提供する場合（情報保護契約を締結した上で必要最低限の情報のみ）`,
  },
  {
    title: '5. 個人情報の安全管理',
    content: `当サービスは、取得した個人情報について、不正アクセス・漏洩・滅失・毀損を防止するため、適切なセキュリティ対策を実施します。個人情報の取り扱いを委託する場合には、委託先においても適切な管理が行われるよう監督します。`,
  },
  {
    title: '6. クッキー（Cookie）について',
    content: `当サービスでは、ウェブサイトの利便性向上・アクセス分析のためにクッキーを使用することがあります。ブラウザの設定によりクッキーを拒否することができますが、一部機能がご利用いただけなくなる場合があります。`,
  },
  {
    title: '7. 個人情報の開示・訂正・削除',
    content: `ご本人から個人情報の開示・訂正・利用停止・削除の請求があった場合は、合理的な期間内に対応いたします。お問い合わせページよりご連絡ください。なお、本人確認のため、所定の書類をご提出いただく場合があります。`,
  },
  {
    title: '8. 未成年者の個人情報',
    content: `16歳未満の方がサービスを利用される場合は、保護者の方のご同意をいただいた上でご利用ください。`,
  },
  {
    title: '9. プライバシーポリシーの変更',
    content: `当サービスは、法令の改正やサービス内容の変更に伴い、本プライバシーポリシーを変更することがあります。変更後は当ウェブサイトに掲載し、重要な変更の場合はメール等でお知らせします。`,
  },
  {
    title: '10. お問い合わせ窓口',
    content: `個人情報の取り扱いに関するお問い合わせは、当サービスのお問い合わせページよりご連絡ください。`,
  },
]

export default function Privacy() {
  return (
    <div style={{ fontFamily: "'Noto Sans KR', sans-serif" }}>
      <Head>
        <title>プライバシーポリシー | 電話韓国語 チグム</title>
        <meta name="description" content="電話韓国語 チグムのプライバシーポリシー（個人情報保護方針）です。" />
      </Head>
      <Header />

      <main className="min-h-[80vh] bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-6">
          <div className="mb-10">
            <p className="text-sm uppercase tracking-[0.3em] text-[#A32D2D] mb-3">PRIVACY</p>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#0C447C] mb-3">プライバシーポリシー</h1>
            <p className="text-sm text-gray-500">最終更新日：2026年6月1日</p>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm px-6 py-8 space-y-8">
            <p className="text-sm text-gray-600 leading-relaxed border-l-4 border-[#A32D2D] pl-4">
              電話韓国語 チグムは、個人情報保護法（個人情報の保護に関する法律）およびその他関連法令を遵守し、ご利用の皆さまの個人情報を適切に保護することをお約束します。
            </p>

            {SECTIONS.map((sec, i) => (
              <div key={i}>
                <h2 className="font-bold text-[#0C447C] mb-3">{sec.title}</h2>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{sec.content}</p>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-gray-400 mt-8">以上</p>
        </div>
      </main>

      <Footer />
    </div>
  )
}
