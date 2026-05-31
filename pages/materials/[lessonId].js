import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import { supabase } from '../../lib/supabaseClient'

const LESSON_DATA = {
  'step1-lesson1': {
    course: '一般会話 Step 1',
    lesson: 1,
    title: '挨拶をしてみましょう',
    keyPhrases: [
      { kr: '안녕하세요.', jp: 'こんにちは。', romanize: 'Annyeonghaseyo.' },
      { kr: '처음 뵙겠습니다.', jp: 'はじめまして。', romanize: 'Cheoeum boepgesseumnida.' },
      { kr: '잘 부탁드려요.', jp: 'よろしくお願いします。', romanize: 'Jal butakdeuryeoyo.' },
      { kr: '감사합니다.', jp: 'ありがとうございます。', romanize: 'Gamsahamnida.' },
      { kr: '안녕히 계세요.', jp: 'さようなら。（相手が残る場合）', romanize: 'Annyeonghi gyeseyo.' },
    ],
    vocabulary: [
      { kr: '안녕하다', jp: '安寧だ・元気だ', pos: '形容詞' },
      { kr: '처음', jp: '初めて', pos: '副詞' },
      { kr: '뵙다', jp: 'お会いする（謙譲語）', pos: '動詞' },
      { kr: '부탁', jp: 'お願い', pos: '名詞' },
      { kr: '감사', jp: '感謝', pos: '名詞' },
      { kr: '안녕히', jp: '安らかに', pos: '副詞' },
    ],
    conversation: [
      { speaker: 'A', kr: '안녕하세요! 처음 뵙겠습니다.', jp: 'こんにちは！はじめまして。' },
      { speaker: 'B', kr: '안녕하세요! 저도 처음 뵙겠습니다.', jp: 'こんにちは！こちらこそはじめまして。' },
      { speaker: 'A', kr: '잘 부탁드려요.', jp: 'よろしくお願いします。' },
      { speaker: 'B', kr: '네, 저도 잘 부탁드려요.', jp: 'はい、こちらこそよろしくお願いします。' },
      { speaker: 'A', kr: '오늘 너무 반가웠어요. 안녕히 계세요!', jp: '今日はお会いできて嬉しかったです。さようなら！' },
      { speaker: 'B', kr: '네, 안녕히 가세요!', jp: 'はい、さようなら！' },
    ],
    exercises: [
      { q: '「こんにちは」を韓国語で言ってみましょう。', a: '안녕하세요.' },
      { q: '「はじめまして」を韓国語で言ってみましょう。', a: '처음 뵙겠습니다.' },
      { q: '「ありがとうございます」を韓国語で言ってみましょう。', a: '감사합니다.' },
      { q: '相手が帰るときの「さようなら」を韓国語で言ってみましょう。', a: '안녕히 가세요.' },
    ],
    point: `【ポイント①】안녕하세요 vs 안녕히 가세요・안녕히 계세요\n「안녕하세요」は出会いの挨拶です。別れの挨拶は2種類あります。\n・自分が帰るとき → 안녕히 계세요（残る相手に向けて）\n・相手が帰るとき → 안녕히 가세요（帰る相手に向けて）\n\n【ポイント②】ヘヨ体（해요체）について\nこのコースではヘヨ体を使います。丁寧で親しみやすい表現として、日常会話で最もよく使われます。`,
  },
  'step1-lesson2': {
    course: '一般会話 Step 1',
    lesson: 2,
    title: '自己紹介をしてみましょう',
    keyPhrases: [
      { kr: '저는 ○○이에요/예요.', jp: '私は○○です。', romanize: 'Jeoneun ○○ieyo/yeyo.' },
      { kr: '일본 사람이에요.', jp: '日本人です。', romanize: 'Ilbon saramieyo.' },
      { kr: '한국어를 공부해요.', jp: '韓国語を勉強しています。', romanize: 'Hangugoreul gongbuhaeyo.' },
      { kr: '잘 못해요.', jp: 'あまり得意じゃないです。', romanize: 'Jal mothaeyo.' },
      { kr: '열심히 할게요.', jp: '頑張ります。', romanize: 'Yeolsimhi halgeyo.' },
    ],
    vocabulary: [
      { kr: '저', jp: '私（丁寧）', pos: '代名詞' },
      { kr: '일본', jp: '日本', pos: '名詞' },
      { kr: '사람', jp: '人', pos: '名詞' },
      { kr: '공부하다', jp: '勉強する', pos: '動詞' },
      { kr: '열심히', jp: '一生懸命に', pos: '副詞' },
    ],
    conversation: [
      { speaker: 'A', kr: '자기소개를 해 주세요.', jp: '自己紹介をしてください。' },
      { speaker: 'B', kr: '네, 저는 야마다예요. 일본 사람이에요.', jp: 'はい、私は山田です。日本人です。' },
      { speaker: 'A', kr: '한국어를 잘 해요?', jp: '韓国語は上手ですか？' },
      { speaker: 'B', kr: '아직 잘 못해요. 하지만 열심히 할게요!', jp: 'まだ得意じゃないです。でも頑張ります！' },
      { speaker: 'A', kr: '파이팅!', jp: 'ファイト！' },
    ],
    exercises: [
      { q: '「私は（名前）です」を韓国語で言ってみましょう。', a: '저는 ○○이에요/예요.' },
      { q: '「韓国語を勉強しています」を韓国語で言ってみましょう。', a: '한국어를 공부해요.' },
      { q: '「頑張ります」を韓国語で言ってみましょう。', a: '열심히 할게요.' },
    ],
    point: `【ポイント①】이에요 vs 예요\n名前や単語の後ろに「〜です」をつけるとき、前の文字にパッチム（最後の子音）があるかどうかで変わります。\n・パッチムあり → 이에요（例：학생이에요）\n・パッチムなし → 예요（例：야마다예요）\n\n【ポイント②】저 vs 나\n「私」は2種類あります。\n・저（ジョ）：目上の人や初対面に使う丁寧な表現\n・나（ナ）：友達・親しい人に使うカジュアルな表現`,
  },
}

const TABS = [
  { id: 'key',      label: 'キーフレーズ', icon: '⭐' },
  { id: 'vocab',    label: '単語リスト',   icon: '📝' },
  { id: 'conv',     label: '会話',         icon: '💬' },
  { id: 'exercise', label: '練習問題',     icon: '✏️' },
  { id: 'point',    label: 'ポイント解説', icon: '💡' },
]

export default function LessonDetail() {
  const router = useRouter()
  const { lessonId } = router.query
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('key')
  const [revealed, setRevealed] = useState({})

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      setLoading(false)
    })
  }, [])

  if (loading || !lessonId) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-400 text-sm">読み込み中...</p>
    </div>
  )

  const lesson = LESSON_DATA[lessonId]

  return (
    <div style={{ fontFamily: "'Noto Sans KR', sans-serif" }}>
      <Head>
        <title>{lesson ? `${lesson.title} | チグム教材` : '教材'}</title>
      </Head>
      <Header />
      <main className="min-h-[80vh] bg-gray-50 py-10">
        <div className="max-w-3xl mx-auto px-6">
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-6">
            <Link href="/materials" className="hover:text-[#A32D2D] transition">教材一覧</Link>
            <span>›</span>
            {lesson && <><span className="text-gray-500">{lesson.course}</span><span>›</span></>}
            <span className="text-gray-600">{lesson ? `第${lesson.lesson}課` : lessonId}</span>
          </div>

          {lesson ? (
            <>
              <div className="bg-white rounded-3xl border border-[#E5E7EB] shadow-sm px-6 py-5 mb-6">
                <p className="text-xs font-semibold text-[#A32D2D] mb-1">{lesson.course} ／ 第{lesson.lesson}課</p>
                <h1 className="text-xl md:text-2xl font-extrabold text-[#0C447C]">{lesson.title}</h1>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1 mb-6">
                {TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition
                      ${activeTab === tab.id
                        ? 'bg-[#A32D2D] text-white shadow-sm'
                        : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                  >
                    <span>{tab.icon}</span>{tab.label}
                  </button>
                ))}
              </div>

              <div className="bg-white rounded-3xl border border-[#E5E7EB] shadow-sm p-6">

                {activeTab === 'key' && (
                  <div className="space-y-3">
                    <h2 className="text-base font-bold text-[#0C447C] mb-4">今日のキーフレーズ</h2>
                    {lesson.keyPhrases.map((p, i) => (
                      <div key={i} className="rounded-2xl bg-[#A32D2D]/5 border border-[#A32D2D]/15 px-5 py-4">
                        <p className="text-xl font-bold text-[#A32D2D] mb-1">{p.kr}</p>
                        <p className="text-sm text-gray-500 mb-0.5">{p.romanize}</p>
                        <p className="text-sm font-semibold text-gray-700">{p.jp}</p>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'vocab' && (
                  <div>
                    <h2 className="text-base font-bold text-[#0C447C] mb-4">単語リスト</h2>
                    <div className="divide-y divide-gray-100">
                      {lesson.vocabulary.map((v, i) => (
                        <div key={i} className="flex items-center justify-between py-3">
                          <div className="flex items-center gap-3">
                            <span className="text-base font-bold text-[#A32D2D]">{v.kr}</span>
                            <span className="text-[11px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{v.pos}</span>
                          </div>
                          <span className="text-sm text-gray-700 font-medium">{v.jp}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'conv' && (
                  <div>
                    <h2 className="text-base font-bold text-[#0C447C] mb-4">会話を聞いてみましょう</h2>
                    <div className="space-y-3">
                      {lesson.conversation.map((line, i) => (
                        <div key={i} className={`flex gap-3 ${line.speaker === 'B' ? 'flex-row-reverse' : ''}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${line.speaker === 'A' ? 'bg-[#0C447C]' : 'bg-[#A32D2D]'}`}>
                            {line.speaker}
                          </div>
                          <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${line.speaker === 'A' ? 'bg-[#0C447C]/5 border border-[#0C447C]/15' : 'bg-[#A32D2D]/5 border border-[#A32D2D]/15'}`}>
                            <p className="text-base font-semibold text-gray-800">{line.kr}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{line.jp}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'exercise' && (
                  <div>
                    <h2 className="text-base font-bold text-[#0C447C] mb-4">練習問題</h2>
                    <div className="space-y-4">
                      {lesson.exercises.map((ex, i) => (
                        <div key={i} className="rounded-2xl border border-gray-200 p-4">
                          <p className="text-sm font-semibold text-gray-700 mb-3">
                            <span className="inline-block bg-[#0C447C] text-white text-xs font-bold px-2 py-0.5 rounded-full mr-2">Q{i+1}</span>
                            {ex.q}
                          </p>
                          {revealed[i] ? (
                            <div className="bg-[#A32D2D]/5 border border-[#A32D2D]/20 rounded-xl px-4 py-3">
                              <p className="text-lg font-bold text-[#A32D2D]">{ex.a}</p>
                            </div>
                          ) : (
                            <button
                              onClick={() => setRevealed(prev => ({ ...prev, [i]: true }))}
                              className="text-sm text-[#A32D2D] border border-[#A32D2D]/30 rounded-xl px-4 py-2 hover:bg-[#A32D2D]/5 transition font-semibold"
                            >
                              答えを見る
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'point' && (
                  <div>
                    <h2 className="text-base font-bold text-[#0C447C] mb-4">ポイント解説</h2>
                    <div className="bg-[#0C447C]/5 border border-[#0C447C]/15 rounded-2xl px-5 py-4">
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{lesson.point}</p>
                    </div>
                  </div>
                )}

              </div>

              <div className="flex justify-between mt-6">
                <button
                  onClick={() => router.back()}
                  className="text-sm text-gray-500 border border-gray-200 rounded-xl px-4 py-2.5 hover:bg-gray-50 transition"
                >
                  ← 戻る
                </button>
                <Link
                  href="/materials"
                  className="text-sm font-semibold text-[#0C447C] border border-[#0C447C]/30 rounded-xl px-4 py-2.5 hover:bg-[#0C447C]/5 transition"
                >
                  教材一覧へ
                </Link>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-3xl border border-[#E5E7EB] shadow-sm p-12 text-center">
              <p className="text-4xl mb-4">📚</p>
              <p className="text-lg font-bold text-[#0C447C] mb-2">コンテンツ準備中です</p>
              <p className="text-sm text-gray-400 mb-6">このレッスンは現在作成中です。しばらくお待ちください。</p>
              <Link href="/materials" className="inline-block rounded-2xl bg-[#A32D2D] px-6 py-3 text-white text-sm font-semibold hover:opacity-90 transition">
                教材一覧に戻る
              </Link>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
