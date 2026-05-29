export default function Footer() {
  return (
    <>
      <footer className="w-full border-t mt-12" style={{borderColor: 'rgba(91,45,142,0.12)'}}>
        <div className="max-w-5xl mx-auto px-6 py-4 text-[11px] text-gray-600">
          <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-1">
            <div className="text-obang-blue whitespace-nowrap">© {new Date().getFullYear()} 電話韓国語 チグム</div>
            <div className="flex gap-3 whitespace-nowrap">
              <a className="hover:text-obang-blue" href="#">利用規約</a>
              <a className="hover:text-obang-blue" href="#">プライバシー</a>
              <a className="hover:text-obang-blue" href="/contact">お問い合わせ</a>
              <a className="hover:text-obang-blue" href="/coach-recruit">コーチ募集</a>
            </div>
          </div>
        </div>
      </footer>
      <div className="colorful-border-stripe">
        {['#C8272D', '#E8651A', '#F5C400', '#2E8B3A', '#1E6BB8', '#7B3FA0', '#E8457A'].map((color) => (
          <div
            key={color}
            className="colorful-border-stripe__block"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
    </>
  )
}
