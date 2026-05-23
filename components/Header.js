import { useState } from 'react'
import Link from 'next/link'

export default function Header() {
  const [isOpen, setIsOpen] = useState(false)

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
      <header className="w-full bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-obang-red logo-font">
            <div className="relative flex flex-col justify-center gap-0 leading-none">
              <div className="flex items-center gap-1">
                <span className="text-3xl font-semibold relative top-1">chi</span>
                <span className="text-3xl font-semibold relative -top-1">geum</span>
              </div>
              <p
                className="text-[10px] text-black tracking-[0.1em]"
                style={{ position: 'absolute', left: '80px', top: '2.6rem' }}
              >
                korean
              </p>
            </div>
          </Link>

          {/* PC ナビ */}
          <nav className="hidden md:flex items-center space-x-6">
            <a className="text-obang-blue hover:text-obang-red" href="#pricing">部活費</a>
            <a className="text-obang-blue hover:text-obang-red" href="#coach">コーチ</a>
            <a className="text-obang-blue hover:text-obang-red" href="#materials">教材</a>
            <a className="text-obang-blue hover:text-obang-red" href="#testimonials">部員の声</a>
            <a className="ml-4 btn-red-blue" href="/register">仮入部する</a>
          </nav>

          {/* ハンバーガーボタン（スマホのみ） */}
          <button
            className="md:hidden flex flex-col justify-center items-center w-10 h-10 gap-[6px]"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="メニューを開く"
          >
            <span className={`block w-6 h-[2px] bg-gray-700 transition-all duration-300 ${isOpen ? 'rotate-45 translate-y-[8px]' : ''}`} />
            <span className={`block w-6 h-[2px] bg-gray-700 transition-all duration-300 ${isOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-6 h-[2px] bg-gray-700 transition-all duration-300 ${isOpen ? '-rotate-45 -translate-y-[8px]' : ''}`} />
          </button>
        </div>

        {/* スマホ ドロップダウンメニュー */}
        {isOpen && (
          <nav className="md:hidden bg-white border-t border-gray-100 px-6 py-4 flex flex-col gap-4">
            <a className="text-obang-blue hover:text-obang-red text-base" href="#pricing" onClick={() => setIsOpen(false)}>部活費</a>
            <a className="text-obang-blue hover:text-obang-red text-base" href="#coach" onClick={() => setIsOpen(false)}>コーチ</a>
            <a className="text-obang-blue hover:text-obang-red text-base" href="#materials" onClick={() => setIsOpen(false)}>教材</a>
            <a className="text-obang-blue hover:text-obang-red text-base" href="#testimonials" onClick={() => setIsOpen(false)}>部員の声</a>
            <a className="btn-red-blue inline-block text-center" href="/register" onClick={() => setIsOpen(false)}>仮入部する</a>
          </nav>
        )}
      </header>
    </>
  )
}
