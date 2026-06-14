import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabaseClient'

export default function Header() {
  const [isOpen, setIsOpen] = useState(false)
  const [user, setUser] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

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
            <div className="flex items-center gap-1 leading-none">
              <span className="text-6xl font-bold relative top-1" style={{ fontFamily: "'Bebas Neue', sans-serif", transform: 'rotate(-15deg)' }}>chi</span>
              <div className="flex flex-col">
                <span className="text-4xl font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>gum</span>
                <p className="text-[10px] text-black tracking-[0.1em] font-bold -mt-[6px] ml-[11px]">korean</p>
              </div>
            </div>
          </Link>

          {/* PC ナビ */}
          <nav className="hidden md:flex items-center space-x-6">
            <a className="text-obang-blue hover:text-obang-red" href="#pricing">部活費</a>
            <a className="text-obang-blue hover:text-obang-red" href="#coach">コーチ</a>
            <a className="text-obang-blue hover:text-obang-red" href={user ? '/materials' : '/login'}>教材</a>
            
            <a className="text-obang-blue hover:text-obang-red" href="#testimonials">部員の声</a>
            <a className="text-obang-blue hover:text-obang-red" href="/contact">お問い合わせ</a>
            {user ? (
              <a className="text-obang-blue hover:text-obang-red" href="/mypage">マイページ</a>
            ) : (
              <a className="text-obang-blue hover:text-obang-red" href="/login">ログイン</a>
            )}
            <a className="ml-4 btn-red-blue" href="https://utage-system.com/p/D6MRCPkR1lZy">入部する</a>
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
            <a className="text-obang-blue hover:text-obang-red text-base" href={user ? '/materials' : '/login'} onClick={() => setIsOpen(false)}>教材</a>
            
            <a className="text-obang-blue hover:text-obang-red text-base" href="#testimonials" onClick={() => setIsOpen(false)}>部員の声</a>
            <a className="text-obang-blue hover:text-obang-red text-base" href="/contact" onClick={() => setIsOpen(false)}>お問い合わせ</a>
            {user ? (
              <a className="text-obang-blue hover:text-obang-red text-base" href="/mypage" onClick={() => setIsOpen(false)}>マイページ</a>
            ) : (
              <a className="text-obang-blue hover:text-obang-red text-base" href="/login" onClick={() => setIsOpen(false)}>ログイン</a>
            )}
            <a className="btn-red-blue inline-block text-center" href="https://utage-system.com/p/D6MRCPkR1lZy" onClick={() => setIsOpen(false)}>入部する</a>
          </nav>
        )}
      </header>
    </>
  )
}
