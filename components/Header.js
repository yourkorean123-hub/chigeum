import Link from 'next/link'

export default function Header() {
  return (
    <>
      <div className="colorful-border-stripe">
        {['#C8272D', '#E8651A', '#F5C400', '#2E8B3A', '#1E6BB8', '#7B3FA0', '#E8457A'].map((color) => (
          <div
            key={color}
            className="colorful-border-stripe__block"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
      <header className="w-full bg-white border-b border-transparent">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-obang-red logo-font">
          <div className="relative flex flex-col justify-center gap-0 leading-none">
            <div className="flex items-center gap-1">
              <span className="text-3xl font-semibold relative top-1">chi</span>
              <span className="text-3xl font-semibold relative -top-1">geum</span>
            </div>
            <p
              className="text-[10px] text-black tracking-[0.1em]"
              style={{ position: 'absolute', left: '80px', top: '1.7rem' }}
            >
              korean
            </p>
          </div>
        </Link>
        <nav className="space-x-6 flex items-center">
          <a className="text-obang-blue hover:text-obang-red" href="#pricing">部活費</a>
          <a className="text-obang-blue hover:text-obang-red" href="#coach">コーチ</a>
          <a className="text-obang-blue hover:text-obang-red" href="#materials">教材</a>
          <a className="text-obang-blue hover:text-obang-red" href="#testimonials">部員の声</a>
          <a className="ml-4 btn-red-blue" href="/register">仮入部する</a>
        </nav>
      </div>
    </header>
    </>
  )
}
