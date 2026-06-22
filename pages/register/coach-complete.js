import { useEffect, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import { supabase } from '../../lib/supabaseClient'

export default function CoachRegisterComplete() {
  const [status, setStatus] = useState('loading') // loading | success | already_done | error
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    // detectSessionInUrl: true により、URL の #access_token が自動処理されてセッションが確立される
    const run = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session) {
        setStatus('error')
        setErrorMsg('セッションの取得に失敗しました。リンクの有効期限が切れている可能性があります。')
        return
      }

      const userId = session.user.id
      const meta = session.user.user_metadata || {}

      // 二重クリック対策: すでに profiles が存在する場合はスキップ
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single()

      if (existing) {
        setStatus('already_done')
        return
      }

      // profiles テーブルに INSERT
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({ id: userId, role: 'coach' })

      if (profileError) {
        setStatus('error')
        setErrorMsg('プロフィールの作成に失敗しました。運営にお問い合わせください。')
        return
      }

      // coaches テーブルに INSERT（is_active: false で審査待ち）
      const { error: coachError } = await supabase
        .from('coaches')
        .insert({
          id: userId,
          name: meta.name || '',
          bio: meta.bio || '',
          availability_text: meta.availability_text || '',
          is_active: false,
        })

      if (coachError) {
        setStatus('error')
        setErrorMsg('コーチ情報の作成に失敗しました。運営にお問い合わせください。')
        return
      }

      setStatus('success')
    }

    run()
  }, [])

  return (
    <div>
      <Head><title>コーチ登録完了 | 電話韓国語 チグム</title></Head>
      <Header />
      <main className="min-h-[70vh] flex items-center justify-center bg-gray-50 py-16">
        <div className="max-w-md mx-auto px-6 w-full">

          {status === 'loading' && (
            <div className="bg-white rounded-2xl shadow-lg p-10 text-center">
              <p className="text-gray-400 text-sm">登録情報を処理中...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="bg-white rounded-2xl shadow-lg p-10 text-center">
              <p className="text-4xl mb-4">🎉</p>
              <h2 className="text-xl font-bold text-[#0C447C] mb-2">メール確認が完了しました！</h2>
              <p className="text-sm text-gray-500 mb-6">
                登録ありがとうございます。審査が完了次第、改めてご連絡いたします。しばらくお待ちください。
              </p>
              <Link href="/" className="inline-block rounded-xl bg-[#0C447C] px-6 py-3 text-white text-sm font-semibold hover:opacity-90 transition">
                トップページに戻る
              </Link>
            </div>
          )}

          {status === 'already_done' && (
            <div className="bg-white rounded-2xl shadow-lg p-10 text-center">
              <p className="text-4xl mb-4">✅</p>
              <h2 className="text-xl font-bold text-[#0C447C] mb-2">すでに登録済みです</h2>
              <p className="text-sm text-gray-500 mb-6">
                このアカウントはすでに登録完了しています。
              </p>
              <Link href="/dashboard/coach" className="inline-block rounded-xl bg-[#0C447C] px-6 py-3 text-white text-sm font-semibold hover:opacity-90 transition">
                コーチページへ
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="bg-white rounded-2xl shadow-lg p-10 text-center">
              <p className="text-4xl mb-4">⚠️</p>
              <h2 className="text-xl font-bold text-[#A32D2D] mb-2">エラーが発生しました</h2>
              <p className="text-sm text-gray-500 mb-6">{errorMsg}</p>
              <Link href="/contact" className="inline-block rounded-xl bg-[#A32D2D] px-6 py-3 text-white text-sm font-semibold hover:opacity-90 transition">
                お問い合わせ
              </Link>
            </div>
          )}

        </div>
      </main>
      <Footer />
    </div>
  )
}
