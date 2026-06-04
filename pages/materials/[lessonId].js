import { useEffect, useState, useCallback, useRef } from 'react'
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

  'step1-lesson3': {
    course: '一般会話 Step 1', lesson: 3, title: '数字・年齢を言ってみましょう',
    keyPhrases: [
      { kr: '몇 살이에요?', jp: '何歳ですか？', romanize: 'Myeot sarieyo?' },
      { kr: '스물다섯 살이에요.', jp: '25歳です。', romanize: 'Seumul daseot sarieyo.' },
      { kr: '생일이 언제예요?', jp: '誕生日はいつですか？', romanize: 'Saengiri eonjeyeyo?' },
      { kr: '전화번호가 뭐예요?', jp: '電話番号は何ですか？', romanize: 'Jeonhwabeonhoga mwoyeyo?' },
      { kr: '몇 명이에요?', jp: '何人ですか？', romanize: 'Myeot myeongieyo?' },
    ],
    vocabulary: [
      { kr: '나이', jp: '年齢', pos: '名詞' }, { kr: '생일', jp: '誕生日', pos: '名詞' },
      { kr: '전화번호', jp: '電話番号', pos: '名詞' }, { kr: '하나/한', jp: '1（固有語）', pos: '数詞' },
      { kr: '둘/두', jp: '2（固有語）', pos: '数詞' }, { kr: '열', jp: '10（固有語）', pos: '数詞' },
      { kr: '스물', jp: '20（固有語）', pos: '数詞' }, { kr: '살', jp: '〜歳', pos: '依存名詞' },
    ],
    conversation: [
      { speaker: 'A', kr: '실례지만, 나이가 어떻게 되세요?', jp: '失礼ですが、お歳はおいくつですか？' },
      { speaker: 'B', kr: '스물다섯 살이에요. 생일은 3월 15일이에요.', jp: '25歳です。誕生日は3月15日です。' },
      { speaker: 'A', kr: '아, 저보다 두 살 어리네요!', jp: 'あ、私より2歳若いですね！' },
      { speaker: 'B', kr: '그래요? 몇 살이세요?', jp: 'そうですか？何歳ですか？' },
      { speaker: 'A', kr: '스물일곱 살이에요.', jp: '27歳です。' },
    ],
    exercises: [
      { q: '「何歳ですか？」を韓国語で言ってみましょう。', a: '몇 살이에요?' },
      { q: '「誕生日はいつですか？」を韓国語で言ってみましょう。', a: '생일이 언제예요?' },
      { q: '「25歳です」を韓国語で言ってみましょう。', a: '스물다섯 살이에요.' },
    ],
    point: `【ポイント①】固有語数詞と漢数詞\n韓国語には2つの数え方があります。\n・固有語数詞：하나(1)、둘(2)、셋(3)、넷(4)、다섯(5)、여섯(6)、일곱(7)、여덟(8)、아홉(9)、열(10)、스물(20)…\n・漢数詞：일(1)、이(2)、삼(3)、사(4)、오(5)、육(6)、칠(7)、팔(8)、구(9)、십(10)…\n\n【ポイント②】年齢には固有語数詞を使う\n年齢を言うときは固有語数詞＋살を使います。\n・스물다섯 살（25歳）、서른 살（30歳）\n電話番号・日付・金額は漢数詞を使います。`,
  },

  'step1-lesson4': {
    course: '一般会話 Step 1', lesson: 4, title: '日付・曜日を言ってみましょう',
    keyPhrases: [
      { kr: '오늘이 몇 월 며칠이에요?', jp: '今日は何月何日ですか？', romanize: 'Oneuri myeol wol myeochirieyo?' },
      { kr: '오늘은 6월 5일이에요.', jp: '今日は6月5日です。', romanize: 'Oneureun yugwol oirieyo.' },
      { kr: '무슨 요일이에요?', jp: '何曜日ですか？', romanize: 'Museun yoirieyo?' },
      { kr: '목요일이에요.', jp: '木曜日です。', romanize: 'Mogyoirieyo.' },
      { kr: '주말에 뭐 해요?', jp: '週末に何をしますか？', romanize: 'Jumare mwo haeyo?' },
    ],
    vocabulary: [
      { kr: '오늘', jp: '今日', pos: '名詞' }, { kr: '내일', jp: '明日', pos: '名詞' },
      { kr: '어제', jp: '昨日', pos: '名詞' }, { kr: '월요일', jp: '月曜日', pos: '名詞' },
      { kr: '주말', jp: '週末', pos: '名詞' }, { kr: '휴일', jp: '休日', pos: '名詞' },
      { kr: '월', jp: '〜月', pos: '依存名詞' }, { kr: '일', jp: '〜日', pos: '依存名詞' },
    ],
    conversation: [
      { speaker: 'A', kr: '오늘이 몇 월 며칠이에요?', jp: '今日は何月何日ですか？' },
      { speaker: 'B', kr: '6월 5일이에요. 목요일이에요.', jp: '6月5日です。木曜日です。' },
      { speaker: 'A', kr: '이번 주말에 뭐 해요?', jp: '今週の週末に何しますか？' },
      { speaker: 'B', kr: '토요일에 친구를 만나요. 일요일에는 집에 있어요.', jp: '土曜日に友達に会います。日曜日は家にいます。' },
    ],
    exercises: [
      { q: '「今日は何月何日ですか？」を韓国語で言ってみましょう。', a: '오늘이 몇 월 며칠이에요?' },
      { q: '「何曜日ですか？」を韓国語で言ってみましょう。', a: '무슨 요일이에요?' },
      { q: '「週末に何をしますか？」を韓国語で言ってみましょう。', a: '주말에 뭐 해요?' },
    ],
    point: `【ポイント①】曜日の覚え方\n月（월）火（화）水（수）木（목）金（금）土（토）日（일）＋요일\n日本語と同じ漢字の読み方なので覚えやすいです。\n\n【ポイント②】날짜（日付）の言い方\n月は漢数詞＋월、日は漢数詞＋일を使います。\n例：3월 15일（3月15日）＝삼월 십오일\n特殊な読み方：6월（유월）、10월（시월）に注意。`,
  },

  'step1-lesson5': {
    course: '一般会話 Step 1', lesson: 5, title: '時間を言ってみましょう',
    keyPhrases: [
      { kr: '지금 몇 시예요?', jp: '今何時ですか？', romanize: 'Jigeum myeot siyeyo?' },
      { kr: '세 시 삼십 분이에요.', jp: '3時30分です。', romanize: 'Se si samsip bunieyo.' },
      { kr: '몇 시에 시작해요?', jp: '何時に始まりますか？', romanize: 'Myeot sie sijakhaeyo?' },
      { kr: '오전 열 시에 만나요.', jp: '午前10時に会いましょう。', romanize: 'Ojeon yeol sie mannayo.' },
      { kr: '얼마나 걸려요?', jp: 'どのくらいかかりますか？', romanize: 'Eolmana geollyeoyo?' },
    ],
    vocabulary: [
      { kr: '시', jp: '〜時', pos: '依存名詞' }, { kr: '분', jp: '〜分', pos: '依存名詞' },
      { kr: '오전', jp: '午前', pos: '名詞' }, { kr: '오후', jp: '午後', pos: '名詞' },
      { kr: '아침', jp: '朝', pos: '名詞' }, { kr: '저녁', jp: '夕方・夜', pos: '名詞' },
      { kr: '시작하다', jp: '始まる・始める', pos: '動詞' }, { kr: '끝나다', jp: '終わる', pos: '動詞' },
    ],
    conversation: [
      { speaker: 'A', kr: '지금 몇 시예요?', jp: '今何時ですか？' },
      { speaker: 'B', kr: '오후 두 시 반이에요.', jp: '午後2時半です。' },
      { speaker: 'A', kr: '수업이 몇 시에 시작해요?', jp: '授業は何時に始まりますか？' },
      { speaker: 'B', kr: '오후 세 시에 시작해요. 두 시간 걸려요.', jp: '午後3時に始まります。2時間かかります。' },
      { speaker: 'A', kr: '그럼 다섯 시에 끝나요?', jp: 'では5時に終わりますか？' },
      { speaker: 'B', kr: '네, 맞아요!', jp: 'はい、そうです！' },
    ],
    exercises: [
      { q: '「今何時ですか？」を韓国語で言ってみましょう。', a: '지금 몇 시예요?' },
      { q: '「3時30分です」を韓国語で言ってみましょう。', a: '세 시 삼십 분이에요.' },
      { q: '「何時に始まりますか？」を韓国語で言ってみましょう。', a: '몇 시에 시작해요?' },
    ],
    point: `【ポイント①】時間の言い方\n時（시）は固有語数詞を使います：한 시（1時）、두 시（2時）、세 시（3時）…\n分（분）は漢数詞を使います：십 분（10分）、삼십 분（30分）\n半（반）は分の代わりに使えます：두 시 반（2時半）\n\n【ポイント②】〜에（時間の助詞）\n時間を表すときは助詞「에」を使います。\n例：세 시에（3時に）、아침에（朝に）`,
  },

  'step1-lesson6': {
    course: '一般会話 Step 1', lesson: 6, title: '家族について話しましょう',
    keyPhrases: [
      { kr: '가족이 몇 명이에요?', jp: '家族は何人ですか？', romanize: 'Gajobi myeot myeongieyo?' },
      { kr: '네 명이에요.', jp: '4人です。', romanize: 'Ne myeongieyo.' },
      { kr: '형제가 있어요?', jp: '兄弟はいますか？', romanize: 'Hyeongjega isseoyo?' },
      { kr: '언니가 한 명 있어요.', jp: '姉が一人います。', romanize: 'Eonniga han myeong isseoyo.' },
      { kr: '부모님은 어디 사세요?', jp: 'ご両親はどこに住んでいますか？', romanize: 'Bumonimeun eodi saseyo?' },
    ],
    vocabulary: [
      { kr: '가족', jp: '家族', pos: '名詞' }, { kr: '부모님', jp: '両親（敬語）', pos: '名詞' },
      { kr: '아버지/아빠', jp: '父', pos: '名詞' }, { kr: '어머니/엄마', jp: '母', pos: '名詞' },
      { kr: '오빠', jp: '兄（女性から）', pos: '名詞' }, { kr: '언니', jp: '姉（女性から）', pos: '名詞' },
      { kr: '형', jp: '兄（男性から）', pos: '名詞' }, { kr: '동생', jp: '弟・妹', pos: '名詞' },
    ],
    conversation: [
      { speaker: 'A', kr: '가족이 몇 명이에요?', jp: '家族は何人ですか？' },
      { speaker: 'B', kr: '네 명이에요. 부모님이랑 저, 그리고 남동생이 한 명 있어요.', jp: '4人です。両親と私、それから弟が一人います。' },
      { speaker: 'A', kr: '동생이 몇 살이에요?', jp: '弟は何歳ですか？' },
      { speaker: 'B', kr: '스무 살이에요. 대학생이에요.', jp: '20歳です。大学生です。' },
      { speaker: 'A', kr: '사이가 좋아요?', jp: '仲が良いですか？' },
      { speaker: 'B', kr: '네, 아주 친해요!', jp: 'はい、とても仲が良いです！' },
    ],
    exercises: [
      { q: '「家族は何人ですか？」を韓国語で言ってみましょう。', a: '가족이 몇 명이에요?' },
      { q: '「姉が一人います」を韓国語で言ってみましょう。', a: '언니가 한 명 있어요.' },
      { q: '「兄弟はいますか？」を韓国語で言ってみましょう。', a: '형제가 있어요?' },
    ],
    point: `【ポイント①】家族の呼び方は話者の性別で異なる\n・兄のこと：男性→형（ヒョン）、女性→오빠（オッパ）\n・姉のこと：男性→누나（ヌナ）、女性→언니（オンニ）\n\n【ポイント②】있어요 / 없어요（います/いません）\n존재を表すときに使います。\n・남동생이 있어요（弟がいます）\n・형제가 없어요（兄弟がいません）`,
  },

  'step1-lesson7': {
    course: '一般会話 Step 1', lesson: 7, title: '職業について話しましょう',
    keyPhrases: [
      { kr: '직업이 뭐예요?', jp: '職業は何ですか？', romanize: 'Jigeopi mwoyeyo?' },
      { kr: '회사원이에요.', jp: '会社員です。', romanize: 'Hoesawoniyeyo.' },
      { kr: '어디서 일해요?', jp: 'どこで働いていますか？', romanize: 'Eodiseo ilhaeyo?' },
      { kr: '도쿄에 있는 회사에서 일해요.', jp: '東京にある会社で働いています。', romanize: 'Tokyoe inneun hoesaeseo ilhaeyo.' },
      { kr: '일이 재미있어요?', jp: '仕事は楽しいですか？', romanize: 'Iri jaemiisseoyo?' },
    ],
    vocabulary: [
      { kr: '직업', jp: '職業', pos: '名詞' }, { kr: '회사원', jp: '会社員', pos: '名詞' },
      { kr: '선생님', jp: '先生', pos: '名詞' }, { kr: '학생', jp: '学生', pos: '名詞' },
      { kr: '의사', jp: '医者', pos: '名詞' }, { kr: '간호사', jp: '看護師', pos: '名詞' },
      { kr: '일하다', jp: '働く', pos: '動詞' }, { kr: '재미있다', jp: '楽しい・面白い', pos: '形容詞' },
    ],
    conversation: [
      { speaker: 'A', kr: '직업이 뭐예요?', jp: '職業は何ですか？' },
      { speaker: 'B', kr: '저는 선생님이에요. 중학교에서 영어를 가르쳐요.', jp: '私は先生です。中学校で英語を教えています。' },
      { speaker: 'A', kr: '아, 그렇군요. 일이 재미있어요?', jp: 'あ、そうですか。仕事は楽しいですか？' },
      { speaker: 'B', kr: '네, 아이들이 좋아서 즐거워요. 씨는요?', jp: 'はい、子どもたちが好きで楽しいです。あなたは？' },
      { speaker: 'A', kr: '저는 회사원이에요. 무역 회사에서 일해요.', jp: '私は会社員です。貿易会社で働いています。' },
    ],
    exercises: [
      { q: '「職業は何ですか？」を韓国語で言ってみましょう。', a: '직업이 뭐예요?' },
      { q: '「会社員です」を韓国語で言ってみましょう。', a: '회사원이에요.' },
      { q: '「仕事は楽しいですか？」を韓国語で言ってみましょう。', a: '일이 재미있어요?' },
    ],
    point: `【ポイント①】職業を言う表現\n職業＋이에요/예요 で表します。\n・선생님이에요（先生です）・학생이에요（学生です）\n\n【ポイント②】〜에서（場所の助詞）\n動作が行われる場所を表します。\n・회사에서 일해요（会社で働きます）\n・학교에서 공부해요（学校で勉強します）`,
  },

  'step1-lesson8': {
    course: '一般会話 Step 1', lesson: 8, title: '趣味について話しましょう',
    keyPhrases: [
      { kr: '취미가 뭐예요?', jp: '趣味は何ですか？', romanize: 'Chwimiga mwoyeyo?' },
      { kr: '음악 듣는 걸 좋아해요.', jp: '音楽を聴くのが好きです。', romanize: 'Eumak deutneun geol joahaeyo.' },
      { kr: '운동을 자주 해요?', jp: '運動をよくしますか？', romanize: 'Undongul jaju haeyo?' },
      { kr: '주말에 등산을 자주 가요.', jp: '週末によく登山に行きます。', romanize: 'Jumare deungsaneul jaju gayo.' },
      { kr: '같이 해볼래요?', jp: '一緒にやってみますか？', romanize: 'Gachi haebollaeyo?' },
    ],
    vocabulary: [
      { kr: '취미', jp: '趣味', pos: '名詞' }, { kr: '운동', jp: '運動', pos: '名詞' },
      { kr: '독서', jp: '読書', pos: '名詞' }, { kr: '요리', jp: '料理', pos: '名詞' },
      { kr: '여행', jp: '旅行', pos: '名詞' }, { kr: '좋아하다', jp: '好きだ', pos: '動詞' },
      { kr: '자주', jp: 'よく・しばしば', pos: '副詞' }, { kr: '같이', jp: '一緒に', pos: '副詞' },
    ],
    conversation: [
      { speaker: 'A', kr: '취미가 뭐예요?', jp: '趣味は何ですか？' },
      { speaker: 'B', kr: '저는 요리하는 걸 좋아해요. 주말마다 새로운 요리를 만들어요.', jp: '私は料理するのが好きです。週末ごとに新しい料理を作ります。' },
      { speaker: 'A', kr: '와, 멋있네요! 저는 운동을 좋아해요.', jp: 'わ、かっこいいですね！私は運動が好きです。' },
      { speaker: 'B', kr: '무슨 운동을 해요?', jp: 'どんな運動をしますか？' },
      { speaker: 'A', kr: '수영이랑 등산을 자주 해요.', jp: '水泳と登山をよくします。' },
    ],
    exercises: [
      { q: '「趣味は何ですか？」を韓国語で言ってみましょう。', a: '취미가 뭐예요?' },
      { q: '「音楽を聴くのが好きです」を韓国語で言ってみましょう。', a: '음악 듣는 걸 좋아해요.' },
      { q: '「一緒にやってみますか？」を韓国語で言ってみましょう。', a: '같이 해볼래요?' },
    ],
    point: `【ポイント①】〜하는 걸 좋아해요（〜するのが好きです）\n動詞＋는 걸 좋아해요 で「〜するのが好き」を表します。\n・요리하는 걸 좋아해요（料理するのが好きです）\n・영화 보는 걸 좋아해요（映画を見るのが好きです）\n\n【ポイント②】頻度の副詞\n・항상（いつも）・자주（よく）・가끔（たまに）・별로（あまり）・안（〜ない）`,
  },

  'step1-lesson9': {
    course: '一般会話 Step 1', lesson: 9, title: '食べ物・注文をしてみましょう',
    keyPhrases: [
      { kr: '뭐 드실 거예요?', jp: '何を召し上がりますか？', romanize: 'Mwo deusil geoyeyo?' },
      { kr: '비빔밥 하나 주세요.', jp: 'ビビンバ一つください。', romanize: 'Bibimbap hana juseyo.' },
      { kr: '매운 음식 잘 먹어요?', jp: '辛い食べ物は得意ですか？', romanize: 'Maeun eumsik jal meogeoyo?' },
      { kr: '조금 맵게 해주세요.', jp: '少し辛くしてください。', romanize: 'Jogeum maepge haejuseyo.' },
      { kr: '맛있어요!', jp: 'おいしいです！', romanize: 'Masisseoyo!' },
    ],
    vocabulary: [
      { kr: '음식', jp: '食べ物・料理', pos: '名詞' }, { kr: '맛있다', jp: 'おいしい', pos: '形容詞' },
      { kr: '맵다', jp: '辛い', pos: '形容詞' }, { kr: '달다', jp: '甘い', pos: '形容詞' },
      { kr: '짜다', jp: '塩辛い', pos: '形容詞' }, { kr: '주문하다', jp: '注文する', pos: '動詞' },
      { kr: '주세요', jp: 'ください', pos: '表現' }, { kr: '얼마예요?', jp: 'いくらですか？', pos: '表現' },
    ],
    conversation: [
      { speaker: 'A', kr: '어서 오세요! 몇 분이세요?', jp: 'いらっしゃいませ！何名様ですか？' },
      { speaker: 'B', kr: '두 명이에요. 비빔밥이랑 김치찌개 하나씩 주세요.', jp: '2名です。ビビンバとキムチチゲを一つずつください。' },
      { speaker: 'A', kr: '네, 알겠습니다. 음료는요?', jp: 'はい、かしこまりました。お飲み物は？' },
      { speaker: 'B', kr: '물 두 잔 주세요.', jp: '水を2杯ください。' },
      { speaker: 'A', kr: '잠시만 기다려 주세요.', jp: '少々お待ちください。' },
    ],
    exercises: [
      { q: '「ビビンバ一つください」を韓国語で言ってみましょう。', a: '비빔밥 하나 주세요.' },
      { q: '「おいしいです」を韓国語で言ってみましょう。', a: '맛있어요!' },
      { q: '「辛い食べ物は得意ですか？」を韓国語で言ってみましょう。', a: '매운 음식 잘 먹어요?' },
    ],
    point: `【ポイント①】〜주세요（ください）\n注文や依頼に使う便利な表現です。\n・비빔밥 하나 주세요（ビビンバ一つください）\n・물 주세요（水をください）\n\n【ポイント②】味の形容詞\n・맛있다（おいしい）・맛없다（まずい）\n・맵다（辛い）・달다（甘い）・짜다（塩辛い）・싱겁다（薄い）`,
  },

  'step1-lesson10': {
    course: '一般会話 Step 1', lesson: 10, title: '買い物をしてみましょう',
    keyPhrases: [
      { kr: '이거 얼마예요?', jp: 'これはいくらですか？', romanize: 'Igeo eolmayeyo?' },
      { kr: '오만 원이에요.', jp: '5万ウォンです。', romanize: 'Oman woniyeyo.' },
      { kr: '좀 더 싸게 해주세요.', jp: 'もう少し安くしてください。', romanize: 'Jom deo ssage haejuseyo.' },
      { kr: '다른 색깔도 있어요?', jp: '他の色もありますか？', romanize: 'Dareun saekkalro isseoyo?' },
      { kr: '이걸로 할게요.', jp: 'これにします。', romanize: 'Igeolro halgeyo.' },
    ],
    vocabulary: [
      { kr: '가격', jp: '価格', pos: '名詞' }, { kr: '비싸다', jp: '高い（値段）', pos: '形容詞' },
      { kr: '싸다', jp: '安い', pos: '形容詞' }, { kr: '색깔', jp: '色', pos: '名詞' },
      { kr: '사이즈', jp: 'サイズ', pos: '名詞' }, { kr: '카드', jp: 'カード', pos: '名詞' },
      { kr: '할인', jp: '割引', pos: '名詞' }, { kr: '영수증', jp: 'レシート', pos: '名詞' },
    ],
    conversation: [
      { speaker: 'A', kr: '어서 오세요! 찾으시는 거 있으세요?', jp: 'いらっしゃいませ！お探しのものはありますか？' },
      { speaker: 'B', kr: '이 티셔츠 얼마예요?', jp: 'このTシャツはいくらですか？' },
      { speaker: 'A', kr: '이만 원이에요.', jp: '2万ウォンです。' },
      { speaker: 'B', kr: '흰색으로 다른 사이즈도 있어요?', jp: '白色で他のサイズもありますか？' },
      { speaker: 'A', kr: '네, L 사이즈도 있어요.', jp: 'はい、Lサイズもあります。' },
      { speaker: 'B', kr: '그럼 L 사이즈로 살게요. 카드 돼요?', jp: 'では、Lサイズを買います。カードは使えますか？' },
    ],
    exercises: [
      { q: '「これはいくらですか？」を韓国語で言ってみましょう。', a: '이거 얼마예요?' },
      { q: '「もう少し安くしてください」を韓国語で言ってみましょう。', a: '좀 더 싸게 해주세요.' },
      { q: '「これにします」を韓国語で言ってみましょう。', a: '이걸로 할게요.' },
    ],
    point: `【ポイント①】이거/그거/저거（これ/それ/あれ）\n物を指すときの基本表現です。\n・이거（これ）・그거（それ）・저거（あれ）\n・이건（これは）・이게（これが）・이걸로（これで）\n\n【ポイント②】金額の読み方\n韓国語の金額は漢数詞で読みます。\n・만 원（1万ウォン）・오만 원（5万ウォン）\n・백 원（100ウォン）・천 원（1000ウォン）`,
  },

  'step1-lesson11': {
    course: '一般会話 Step 1', lesson: 11, title: '場所・道案内をしてみましょう',
    keyPhrases: [
      { kr: '여기가 어디예요?', jp: 'ここはどこですか？', romanize: 'Yeogiga eodiyeyo?' },
      { kr: '지하철역이 어디에 있어요?', jp: '地下鉄の駅はどこにありますか？', romanize: 'Jihacheollyeogi eodie isseoyo?' },
      { kr: '똑바로 가세요.', jp: 'まっすぐ行ってください。', romanize: 'Ttokbaro gaseyo.' },
      { kr: '오른쪽으로 도세요.', jp: '右に曲がってください。', romanize: 'Oreunjjogeuro doseyo.' },
      { kr: '걸어서 얼마나 걸려요?', jp: '歩いてどのくらいかかりますか？', romanize: 'Georeoseo eolmana geollyeoyo?' },
    ],
    vocabulary: [
      { kr: '오른쪽', jp: '右', pos: '名詞' }, { kr: '왼쪽', jp: '左', pos: '名詞' },
      { kr: '앞', jp: '前', pos: '名詞' }, { kr: '뒤', jp: '後ろ', pos: '名詞' },
      { kr: '근처', jp: '近く', pos: '名詞' }, { kr: '길', jp: '道', pos: '名詞' },
      { kr: '건너다', jp: '渡る', pos: '動詞' }, { kr: '걷다', jp: '歩く', pos: '動詞' },
    ],
    conversation: [
      { speaker: 'A', kr: '실례합니다. 편의점이 어디에 있어요?', jp: 'すみません。コンビニはどこにありますか？' },
      { speaker: 'B', kr: '이 길로 똑바로 가면 오른쪽에 있어요.', jp: 'この道をまっすぐ行くと右側にあります。' },
      { speaker: 'A', kr: '걸어서 얼마나 걸려요?', jp: '歩いてどのくらいかかりますか？' },
      { speaker: 'B', kr: '한 5분 정도 걸려요.', jp: '5分くらいかかります。' },
      { speaker: 'A', kr: '감사합니다!', jp: 'ありがとうございます！' },
    ],
    exercises: [
      { q: '「地下鉄の駅はどこにありますか？」を韓国語で言ってみましょう。', a: '지하철역이 어디에 있어요?' },
      { q: '「まっすぐ行ってください」を韓国語で言ってみましょう。', a: '똑바로 가세요.' },
      { q: '「右に曲がってください」を韓国語で言ってみましょう。', a: '오른쪽으로 도세요.' },
    ],
    point: `【ポイント①】方向の表現\n・오른쪽（右）・왼쪽（左）・앞（前）・뒤（後ろ）\n・위（上）・아래（下）・옆（横）・맞은편（向かい）\n\n【ポイント②】〜으로/로（〜へ・〜の方向に）\n方向を示す助詞です。\n・오른쪽으로 가세요（右へ行ってください）\n・지하철로 가요（地下鉄で行きます）`,
  },

  'step1-lesson12': {
    course: '一般会話 Step 1', lesson: 12, title: '交通機関を使ってみましょう',
    keyPhrases: [
      { kr: '어떻게 가요?', jp: 'どうやって行きますか？', romanize: 'Eotteoke gayo?' },
      { kr: '지하철로 가면 돼요.', jp: '地下鉄で行けばいいです。', romanize: 'Jihacheolro gamyeon dwaeyo.' },
      { kr: '몇 번 버스를 타요?', jp: '何番のバスに乗りますか？', romanize: 'Myeot beon beoseureul tayo?' },
      { kr: '어디서 갈아타요?', jp: 'どこで乗り換えますか？', romanize: 'Eodiseo garatayo?' },
      { kr: '다음 역에서 내려요.', jp: '次の駅で降ります。', romanize: 'Daeum yeogeseo naeryeoyo.' },
    ],
    vocabulary: [
      { kr: '지하철', jp: '地下鉄', pos: '名詞' }, { kr: '버스', jp: 'バス', pos: '名詞' },
      { kr: '택시', jp: 'タクシー', pos: '名詞' }, { kr: '기차', jp: '電車・汽車', pos: '名詞' },
      { kr: '타다', jp: '乗る', pos: '動詞' }, { kr: '내리다', jp: '降りる', pos: '動詞' },
      { kr: '갈아타다', jp: '乗り換える', pos: '動詞' }, { kr: '교통카드', jp: 'ICカード', pos: '名詞' },
    ],
    conversation: [
      { speaker: 'A', kr: '경복궁에 어떻게 가요?', jp: '景福宮にはどうやって行きますか？' },
      { speaker: 'B', kr: '3호선 타고 경복궁역에서 내리면 돼요.', jp: '3号線に乗って景福宮駅で降りればいいです。' },
      { speaker: 'A', kr: '여기서 몇 정거장이에요?', jp: 'ここから何駅ですか？' },
      { speaker: 'B', kr: '세 정거장이에요. 약 10분 걸려요.', jp: '3駅です。約10分かかります。' },
      { speaker: 'A', kr: '교통카드로 탈 수 있어요?', jp: 'ICカードで乗れますか？' },
      { speaker: 'B', kr: '네, 편의점에서 살 수 있어요.', jp: 'はい、コンビニで買えます。' },
    ],
    exercises: [
      { q: '「どうやって行きますか？」を韓国語で言ってみましょう。', a: '어떻게 가요?' },
      { q: '「次の駅で降ります」を韓国語で言ってみましょう。', a: '다음 역에서 내려요.' },
      { q: '「どこで乗り換えますか？」を韓国語で言ってみましょう。', a: '어디서 갈아타요?' },
    ],
    point: `【ポイント①】〜(으)면 돼요（〜すればいいです）\n「〜すればいい」「〜で大丈夫」を表す便利な表現。\n・지하철로 가면 돼요（地下鉄で行けばいいです）\n・여기서 내리면 돼요（ここで降りればいいです）\n\n【ポイント②】교통 관련 단어（交通関連語）\n타다（乗る）→ 내리다（降りる）→ 갈아타다（乗り換える）の流れで覚えましょう。`,
  },

  'step1-lesson13': {
    course: '一般会話 Step 1', lesson: 13, title: '天気について話しましょう',
    keyPhrases: [
      { kr: '오늘 날씨가 어때요?', jp: '今日の天気はどうですか？', romanize: 'Oneul nalssiga eottaeyo?' },
      { kr: '날씨가 정말 좋아요!', jp: '天気が本当にいいです！', romanize: 'Nalssiga jeongmal joayo!' },
      { kr: '비가 와요.', jp: '雨が降っています。', romanize: 'Biga wayo.' },
      { kr: '오늘 많이 덥네요.', jp: '今日はとても暑いですね。', romanize: 'Oneul mani deomneyo.' },
      { kr: '우산 가져왔어요?', jp: '傘を持ってきましたか？', romanize: 'Usan gajyeowasseoyo?' },
    ],
    vocabulary: [
      { kr: '날씨', jp: '天気', pos: '名詞' }, { kr: '맑다', jp: '晴れている', pos: '形容詞' },
      { kr: '흐리다', jp: '曇っている', pos: '形容詞' }, { kr: '비', jp: '雨', pos: '名詞' },
      { kr: '눈', jp: '雪', pos: '名詞' }, { kr: '덥다', jp: '暑い', pos: '形容詞' },
      { kr: '춥다', jp: '寒い', pos: '形容詞' }, { kr: '우산', jp: '傘', pos: '名詞' },
    ],
    conversation: [
      { speaker: 'A', kr: '오늘 날씨가 어때요?', jp: '今日の天気はどうですか？' },
      { speaker: 'B', kr: '오전에는 맑았는데 오후에는 비가 온대요.', jp: '午前は晴れていましたが、午後は雨が降るそうです。' },
      { speaker: 'A', kr: '그래요? 우산 가져가야겠네요.', jp: 'そうですか？傘を持っていかないといけませんね。' },
      { speaker: 'B', kr: '네, 오늘 꽤 많이 온다고 해요.', jp: 'はい、今日はかなり降るそうです。' },
      { speaker: 'A', kr: '내일은 날씨가 좋아질까요?', jp: '明日は天気が良くなるかな？' },
    ],
    exercises: [
      { q: '「今日の天気はどうですか？」を韓国語で言ってみましょう。', a: '오늘 날씨가 어때요?' },
      { q: '「雨が降っています」を韓国語で言ってみましょう。', a: '비가 와요.' },
      { q: '「今日はとても暑いですね」を韓国語で言ってみましょう。', a: '오늘 많이 덥네요.' },
    ],
    point: `【ポイント①】季節の表現\n봄（春）여름（夏）가을（秋）겨울（冬）\n・봄에는 따뜻해요（春は暖かいです）\n・여름에는 더워요（夏は暑いです）\n\n【ポイント②】〜네요（〜ですね）\n話しながら気づいたことを言うときに使います。\n・날씨가 좋네요（天気がいいですね）\n・많이 춥네요（とても寒いですね）`,
  },

  'step1-lesson14': {
    course: '一般会話 Step 1', lesson: 14, title: '体調・病院について話しましょう',
    keyPhrases: [
      { kr: '몸이 안 좋아요.', jp: '体の具合が悪いです。', romanize: 'Momi an joayo.' },
      { kr: '머리가 아파요.', jp: '頭が痛いです。', romanize: 'Meoriga apayo.' },
      { kr: '열이 있어요.', jp: '熱があります。', romanize: 'Yeori isseoyo.' },
      { kr: '병원에 가봐야겠어요.', jp: '病院に行ってみないといけませんね。', romanize: 'Byeongwone gabwayagesseoyo.' },
      { kr: '빨리 나으세요.', jp: '早く良くなってください。', romanize: 'Ppalli naeuseyo.' },
    ],
    vocabulary: [
      { kr: '몸', jp: '体', pos: '名詞' }, { kr: '머리', jp: '頭', pos: '名詞' },
      { kr: '배', jp: 'お腹', pos: '名詞' }, { kr: '열', jp: '熱', pos: '名詞' },
      { kr: '아프다', jp: '痛い・具合が悪い', pos: '形容詞' }, { kr: '병원', jp: '病院', pos: '名詞' },
      { kr: '약', jp: '薬', pos: '名詞' }, { kr: '쉬다', jp: '休む', pos: '動詞' },
    ],
    conversation: [
      { speaker: 'A', kr: '얼굴색이 안 좋아 보여요. 괜찮아요?', jp: '顔色が悪そうです。大丈夫ですか？' },
      { speaker: 'B', kr: '아침부터 머리도 아프고 열도 있어요.', jp: '朝から頭も痛くて熱もあります。' },
      { speaker: 'A', kr: '그래요? 병원에 가봤어요?', jp: 'そうですか？病院に行ってみましたか？' },
      { speaker: 'B', kr: '아직요. 오늘 오후에 가려고요.', jp: 'まだです。今日の午後に行こうと思っています。' },
      { speaker: 'A', kr: '오늘은 일찍 쉬세요. 빨리 나으세요.', jp: '今日は早めに休んでください。早く良くなってください。' },
    ],
    exercises: [
      { q: '「頭が痛いです」を韓国語で言ってみましょう。', a: '머리가 아파요.' },
      { q: '「熱があります」を韓国語で言ってみましょう。', a: '열이 있어요.' },
      { q: '「早く良くなってください」を韓国語で言ってみましょう。', a: '빨리 나으세요.' },
    ],
    point: `【ポイント①】体の部位＋가/이 아파요（〜が痛いです）\n・머리가 아파요（頭が痛いです）\n・배가 아파요（お腹が痛いです）\n・목이 아파요（喉が痛いです）\n\n【ポイント②】〜아/어 보세요（〜してみてください）\n試してみることを勧める表現です。\n・병원에 가봐야겠어요（病院に行ってみないといけませんね）\n・약을 먹어보세요（薬を飲んでみてください）`,
  },

  'step1-lesson15': {
    course: '一般会話 Step 1', lesson: 15, title: '電話をかけてみましょう',
    keyPhrases: [
      { kr: '여보세요?', jp: 'もしもし？', romanize: 'Yeoboseyo?' },
      { kr: '저 야마다인데요.', jp: '山田ですが。', romanize: 'Jeo yamadaindeyo.' },
      { kr: '지금 통화 괜찮아요?', jp: '今お電話大丈夫ですか？', romanize: 'Jigeum tonghwa gwaenchanayo?' },
      { kr: '잠깐만요.', jp: 'ちょっと待ってください。', romanize: 'Jamkkanmanyo.' },
      { kr: '나중에 다시 전화할게요.', jp: '後でまた電話します。', romanize: 'Najunge dasi jeonhwahalgeyo.' },
    ],
    vocabulary: [
      { kr: '전화', jp: '電話', pos: '名詞' }, { kr: '통화', jp: '通話', pos: '名詞' },
      { kr: '문자', jp: 'メッセージ（SMS）', pos: '名詞' }, { kr: '전화하다', jp: '電話する', pos: '動詞' },
      { kr: '받다', jp: '受ける・受け取る', pos: '動詞' }, { kr: '끊다', jp: '切る', pos: '動詞' },
      { kr: '잠깐', jp: 'ちょっと・少しの間', pos: '副詞' }, { kr: '나중에', jp: '後で', pos: '副詞' },
    ],
    conversation: [
      { speaker: 'A', kr: '여보세요? 혜정 씨이에요?', jp: 'もしもし？ヘジョンさんですか？' },
      { speaker: 'B', kr: '네, 저예요. 야마다 씨, 무슨 일이에요?', jp: 'はい、そうです。山田さん、どうしましたか？' },
      { speaker: 'A', kr: '지금 통화 괜찮아요?', jp: '今お電話大丈夫ですか？' },
      { speaker: 'B', kr: '잠깐만요. 지금 좀 바빠요. 10분 후에 다시 전화해도 될까요?', jp: 'ちょっと待ってください。今少し忙しいです。10分後にまたお電話してもいいですか？' },
      { speaker: 'A', kr: '네, 물론이죠. 그때 연락할게요.', jp: 'はい、もちろんです。その時に連絡します。' },
    ],
    exercises: [
      { q: '「もしもし」を韓国語で言ってみましょう。', a: '여보세요?' },
      { q: '「今お電話大丈夫ですか？」を韓国語で言ってみましょう。', a: '지금 통화 괜찮아요?' },
      { q: '「後でまた電話します」を韓国語で言ってみましょう。', a: '나중에 다시 전화할게요.' },
    ],
    point: `【ポイント①】電話での基本表現\n・여보세요（もしもし）：電話で最初に使う表現\n・저 ○○인데요（○○ですが）：名乗るときの表現\n\n【ポイント②】〜아/어도 될까요？（〜してもいいですか？）\n許可を求める丁寧な表現です。\n・전화해도 될까요?（電話してもいいですか？）\n・들어가도 될까요?（入ってもいいですか？）`,
  },

  'step1-lesson16': {
    course: '一般会話 Step 1', lesson: 16, title: '約束・予定を作りましょう',
    keyPhrases: [
      { kr: '이번 주말에 시간 있어요?', jp: '今週末は時間ありますか？', romanize: 'Ibeon jumare sigan isseoyo?' },
      { kr: '같이 점심 먹을까요?', jp: '一緒にランチを食べませんか？', romanize: 'Gachi jeomsim meogeulkkayo?' },
      { kr: '좋아요! 언제가 좋아요?', jp: 'いいですね！いつがいいですか？', romanize: 'Joayo! Eonjega joayo?' },
      { kr: '토요일 오후 2시는 어때요?', jp: '土曜日の午後2時はどうですか？', romanize: 'Toyoil ohu du sineun eottaeyo?' },
      { kr: '그때 봐요!', jp: 'その時に会いましょう！', romanize: 'Geuttae bwayo!' },
    ],
    vocabulary: [
      { kr: '약속', jp: '約束', pos: '名詞' }, { kr: '예정', jp: '予定', pos: '名詞' },
      { kr: '시간', jp: '時間', pos: '名詞' }, { kr: '만나다', jp: '会う', pos: '動詞' },
      { kr: '괜찮다', jp: '大丈夫だ', pos: '形容詞' }, { kr: '바쁘다', jp: '忙しい', pos: '形容詞' },
      { kr: '기다리다', jp: '待つ', pos: '動詞' }, { kr: '장소', jp: '場所', pos: '名詞' },
    ],
    conversation: [
      { speaker: 'A', kr: '이번 주말에 시간 있어요?', jp: '今週末は時間ありますか？' },
      { speaker: 'B', kr: '토요일은 좀 바빠요. 일요일은 괜찮아요.', jp: '土曜日は少し忙しいです。日曜日は大丈夫です。' },
      { speaker: 'A', kr: '그럼 일요일에 같이 영화 볼까요?', jp: 'では日曜日に一緒に映画を見ませんか？' },
      { speaker: 'B', kr: '좋아요! 몇 시에 만날까요?', jp: 'いいですね！何時に会いましょうか？' },
      { speaker: 'A', kr: '오후 3시에 영화관 앞에서 만나요.', jp: '午後3時に映画館の前で会いましょう。' },
      { speaker: 'B', kr: '알겠어요. 그때 봐요!', jp: 'わかりました。その時に会いましょう！' },
    ],
    exercises: [
      { q: '「今週末は時間ありますか？」を韓国語で言ってみましょう。', a: '이번 주말에 시간 있어요?' },
      { q: '「一緒にランチを食べませんか？」を韓国語で言ってみましょう。', a: '같이 점심 먹을까요?' },
      { q: '「その時に会いましょう！」を韓国語で言ってみましょう。', a: '그때 봐요!' },
    ],
    point: `【ポイント①】〜(을/ㄹ)까요?（〜しませんか？・〜しましょうか？）\n提案・勧誘する表現です。\n・같이 갈까요?（一緒に行きませんか？）\n・뭐 먹을까요?（何を食べましょうか？）\n\n【ポイント②】〜는 어때요?（〜はどうですか？）\n提案するときの表現です。\n・토요일은 어때요?（土曜日はどうですか？）\n・커피 한 잔 어때요?（コーヒー一杯どうですか？）`,
  },

  'step1-lesson17': {
    course: '一般会話 Step 1', lesson: 17, title: '感情表現をしてみましょう',
    keyPhrases: [
      { kr: '너무 기뻐요!', jp: 'とても嬉しいです！', romanize: 'Neomu gippeoyo!' },
      { kr: '슬퍼요.', jp: '悲しいです。', romanize: 'Seulpeoyo.' },
      { kr: '많이 피곤해요.', jp: 'とても疲れました。', romanize: 'Mani pigonhaeyo.' },
      { kr: '걱정하지 마세요.', jp: '心配しないでください。', romanize: 'Geokjeonghaji maseyo.' },
      { kr: '힘내세요!', jp: '頑張ってください！', romanize: 'Himnaese yo!' },
    ],
    vocabulary: [
      { kr: '기쁘다', jp: '嬉しい', pos: '形容詞' }, { kr: '슬프다', jp: '悲しい', pos: '形容詞' },
      { kr: '화나다', jp: '怒る', pos: '動詞' }, { kr: '무섭다', jp: '怖い', pos: '形容詞' },
      { kr: '피곤하다', jp: '疲れている', pos: '形容詞' }, { kr: '걱정', jp: '心配', pos: '名詞' },
      { kr: '행복하다', jp: '幸せだ', pos: '形容詞' }, { kr: '힘들다', jp: '大変だ・つらい', pos: '形容詞' },
    ],
    conversation: [
      { speaker: 'A', kr: '오늘 표정이 좋아 보여요. 좋은 일 있어요?', jp: '今日は表情がいいですね。いいことありましたか？' },
      { speaker: 'B', kr: '네, 승진했어요! 너무 기뻐요.', jp: 'はい、昇進しました！とても嬉しいです。' },
      { speaker: 'A', kr: '와, 축하해요! 정말 잘됐네요!', jp: 'わ、おめでとうございます！本当によかったですね！' },
      { speaker: 'B', kr: '감사해요. 요즘 많이 힘들었는데 드디어 좋은 일이 생겼어요.', jp: 'ありがとうございます。最近とても大変でしたが、やっといいことが起きました。' },
      { speaker: 'A', kr: '고생했어요. 앞으로도 잘 될 거예요!', jp: 'お疲れ様でした。これからもうまくいきますよ！' },
    ],
    exercises: [
      { q: '「とても嬉しいです」を韓国語で言ってみましょう。', a: '너무 기뻐요!' },
      { q: '「心配しないでください」を韓国語で言ってみましょう。', a: '걱정하지 마세요.' },
      { q: '「頑張ってください！」を韓国語で言ってみましょう。', a: '힘내세요!' },
    ],
    point: `【ポイント①】너무 vs 많이（とても）\n両方「とても・非常に」という意味ですが、\n・너무：感情が強く溢れる感じ（너무 기뻐요！）\n・많이：量・程度が多い感じ（많이 피곤해요）\n\n【ポイント②】〜지 마세요（〜しないでください）\n禁止・制止するときの表現です。\n・걱정하지 마세요（心配しないでください）\n・울지 마세요（泣かないでください）`,
  },

  'step1-lesson18': {
    course: '一般会話 Step 1', lesson: 18, title: '過去の出来事を話しましょう',
    keyPhrases: [
      { kr: '지난 주말에 뭐 했어요?', jp: '先週末に何をしましたか？', romanize: 'Jinan jumare mwo haesseoyo?' },
      { kr: '친구를 만났어요.', jp: '友達に会いました。', romanize: 'Chingureul mannasseoyo.' },
      { kr: '어떠셨어요?', jp: 'いかがでしたか？', romanize: 'Eotteossyeosseoyo?' },
      { kr: '정말 재미있었어요!', jp: '本当に楽しかったです！', romanize: 'Jeongmal jaemiisseosseoyo!' },
      { kr: '다음에 또 가고 싶어요.', jp: '次もまた行きたいです。', romanize: 'Daeume tto gago sipeoyo.' },
    ],
    vocabulary: [
      { kr: '지난', jp: '先（過去の）', pos: '冠詞' }, { kr: '어제', jp: '昨日', pos: '名詞' },
      { kr: '지난주', jp: '先週', pos: '名詞' }, { kr: '지난달', jp: '先月', pos: '名詞' },
      { kr: '갔다 오다', jp: '行ってくる', pos: '動詞' }, { kr: '즐겁다', jp: '楽しい', pos: '形容詞' },
      { kr: '맛있었다', jp: 'おいしかった', pos: '形容詞（過去）' }, { kr: '또', jp: 'また・再び', pos: '副詞' },
    ],
    conversation: [
      { speaker: 'A', kr: '지난 주말에 뭐 했어요?', jp: '先週末に何をしましたか？' },
      { speaker: 'B', kr: '부산에 여행 갔다 왔어요. 정말 좋았어요!', jp: '釜山に旅行に行ってきました。本当に良かったです！' },
      { speaker: 'A', kr: '아, 부산이요? 거기서 뭐 했어요?', jp: 'あ、釜山ですか？そこで何をしましたか？' },
      { speaker: 'B', kr: '해운대에서 바다를 보고, 자갈치 시장에서 해산물을 먹었어요.', jp: 'ヘウンデで海を見て、チャガルチ市場で海鮮を食べました。' },
      { speaker: 'A', kr: '맛있었겠다! 저도 꼭 가보고 싶어요.', jp: 'おいしかったでしょう！私もぜひ行ってみたいです。' },
    ],
    exercises: [
      { q: '「先週末に何をしましたか？」を韓国語で言ってみましょう。', a: '지난 주말에 뭐 했어요?' },
      { q: '「友達に会いました」を韓国語で言ってみましょう。', a: '친구를 만났어요.' },
      { q: '「本当に楽しかったです！」を韓国語で言ってみましょう。', a: '정말 재미있었어요!' },
    ],
    point: `【ポイント①】過去形の作り方（ヘヨ体）\n動詞・形容詞の語幹＋았어요/었어요で過去形を作ります。\n・먹다→먹었어요（食べました）\n・가다→갔어요（行きました）\n・좋다→좋았어요（良かったです）\n\n【ポイント②】〜고 싶어요（〜したいです）\n希望・願望を表す表現。\n・가고 싶어요（行きたいです）\n・먹고 싶어요（食べたいです）`,
  },

  'step1-lesson19': {
    course: '一般会話 Step 1', lesson: 19, title: '将来の夢を語りましょう',
    keyPhrases: [
      { kr: '장래희망이 뭐예요?', jp: '将来の夢は何ですか？', romanize: 'Jangraehimmangi mwoyeyo?' },
      { kr: '한국에서 살고 싶어요.', jp: '韓国で暮らしたいです。', romanize: 'Hangugeso salgo sipeoyo.' },
      { kr: '꿈을 이루고 싶어요.', jp: '夢を叶えたいです。', romanize: 'Kkumeul ireugo sipeoyo.' },
      { kr: '열심히 노력할 거예요.', jp: '一生懸命努力するつもりです。', romanize: 'Yeolsimhi noryeokhal geoyeyo.' },
      { kr: '언젠가는 꼭 될 거예요!', jp: 'いつかきっとなれますよ！', romanize: 'Eonjengan kok doel geoyeyo!' },
    ],
    vocabulary: [
      { kr: '꿈', jp: '夢', pos: '名詞' }, { kr: '목표', jp: '目標', pos: '名詞' },
      { kr: '미래', jp: '未来', pos: '名詞' }, { kr: '노력하다', jp: '努力する', pos: '動詞' },
      { kr: '이루다', jp: '叶える・成し遂げる', pos: '動詞' }, { kr: '되다', jp: 'なる', pos: '動詞' },
      { kr: '언젠가', jp: 'いつか', pos: '副詞' }, { kr: '꼭', jp: '必ず・きっと', pos: '副詞' },
    ],
    conversation: [
      { speaker: 'A', kr: '앞으로 어떻게 되고 싶어요?', jp: 'これからどうなりたいですか？' },
      { speaker: 'B', kr: '한국어를 완전히 마스터해서 한국 회사에서 일하고 싶어요.', jp: '韓国語を完全にマスターして、韓国の会社で働きたいです。' },
      { speaker: 'A', kr: '와, 멋진 꿈이네요! 언제까지 목표예요?', jp: 'わ、素敵な夢ですね！いつまでが目標ですか？' },
      { speaker: 'B', kr: '3년 안에 이루고 싶어요. 그래서 매일 열심히 연습하고 있어요.', jp: '3年以内に叶えたいです。だから毎日一生懸命練習しています。' },
      { speaker: 'A', kr: '정말 대단해요. 꼭 이루실 거예요!', jp: '本当にすごいですね。きっと叶えられますよ！' },
    ],
    exercises: [
      { q: '「韓国で暮らしたいです」を韓国語で言ってみましょう。', a: '한국에서 살고 싶어요.' },
      { q: '「夢を叶えたいです」を韓国語で言ってみましょう。', a: '꿈을 이루고 싶어요.' },
      { q: '「一生懸命努力するつもりです」を韓国語で言ってみましょう。', a: '열심히 노력할 거예요.' },
    ],
    point: `【ポイント①】〜(으)ㄹ 거예요（〜するつもりです・〜でしょう）\n未来の予定や意志を表します。\n・열심히 할 거예요（一生懸命やるつもりです）\n・꼭 될 거예요（きっとなれるでしょう）\n\n【ポイント②】〜아/어서（〜して・〜なので）\n理由や手順をつなぐ接続表現。\n・한국어를 배워서 한국에 가고 싶어요（韓国語を学んで韓国に行きたいです）`,
  },

  'step1-lesson20': {
    course: '一般会話 Step 1', lesson: 20, title: 'Step 1まとめ・復習',
    keyPhrases: [
      { kr: '한국어 공부가 재미있어요!', jp: '韓国語の勉強が楽しいです！', romanize: 'Hangugeo gongbuga jaemiisseoyo!' },
      { kr: '많이 늘었어요.', jp: 'とても上達しました。', romanize: 'Mani neurreosseoyo.' },
      { kr: '앞으로도 열심히 할게요.', jp: 'これからも頑張ります。', romanize: 'Apeurodo yeolsimhi halgeyo.' },
      { kr: '궁금한 게 있으면 물어보세요.', jp: '疑問があれば聞いてください。', romanize: 'Gunggeumhan ge isseumyeon mureoboseyo.' },
      { kr: '같이 공부해서 좋았어요!', jp: '一緒に勉強できて良かったです！', romanize: 'Gachi gongbuhaeseo joasseoyo!' },
    ],
    vocabulary: [
      { kr: '복습', jp: '復習', pos: '名詞' }, { kr: '실력', jp: '実力', pos: '名詞' },
      { kr: '늘다', jp: '増える・上達する', pos: '動詞' }, { kr: '계속하다', jp: '続ける', pos: '動詞' },
      { kr: '자신감', jp: '自信', pos: '名詞' }, { kr: '발전', jp: '発展・上達', pos: '名詞' },
      { kr: '노력', jp: '努力', pos: '名詞' }, { kr: '감사하다', jp: '感謝する', pos: '動詞' },
    ],
    conversation: [
      { speaker: 'A', kr: '드디어 Step 1을 다 끝냈네요! 어때요?', jp: 'ついにStep 1を全部終わりましたね！どうですか？' },
      { speaker: 'B', kr: '처음보다 많이 늘었어요. 자신감이 생겼어요!', jp: '最初よりずっと上達しました。自信がつきました！' },
      { speaker: 'A', kr: '정말 열심히 했어요. 발음도 많이 좋아졌어요.', jp: '本当に一生懸命やりました。発音もずいぶん良くなりました。' },
      { speaker: 'B', kr: '감사해요. 앞으로도 계속 공부하고 싶어요.', jp: 'ありがとうございます。これからも続けて勉強したいです。' },
      { speaker: 'A', kr: '화이팅! Step 2도 같이 열심히 해요!', jp: 'ファイト！Step 2も一緒に頑張りましょう！' },
    ],
    exercises: [
      { q: '「韓国語の勉強が楽しいです」を韓国語で言ってみましょう。', a: '한국어 공부가 재미있어요!' },
      { q: '「これからも頑張ります」を韓国語で言ってみましょう。', a: '앞으로도 열심히 할게요.' },
      { q: '「一緒に勉強できて良かったです！」を韓国語で言ってみましょう。', a: '같이 공부해서 좋았어요!' },
    ],
    point: `【Step 1 総復習】\nStep 1で学んだ主な表現：\n①挨拶：안녕하세요 / 감사합니다\n②自己紹介：저는 ○○이에요 / 저는 ○○에서 왔어요\n③数字・時間：몇 시예요? / 얼마예요?\n④日常会話：뭐 해요? / 어디 가요?\n⑤感情・状態：기뻐요 / 피곤해요 / 아파요\n⑥過去・未来：〜았/었어요（過去） / 〜ㄹ 거예요（未来）\n\nStep 2では中級の文法や敬語表現に挑戦しましょう！`,
  },
}

const TABS = [
  { id: 'key',      label: 'キーフレーズ', icon: '⭐' },
  { id: 'vocab',    label: '単語リスト',   icon: '📝' },
  { id: 'conv',     label: '会話',         icon: '💬' },
  { id: 'exercise', label: '練習問題',     icon: '✏️' },
  { id: 'point',    label: 'ポイント解説', icon: '💡' },
]

// ─── 音声読み上げフック ────────────────────────────────────────
function useSpeech() {
  const [speakingId, setSpeakingId] = useState(null)
  const utterRef = useRef(null)

  const speak = useCallback((text, id) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    if (speakingId === id) {
      window.speechSynthesis.cancel()
      setSpeakingId(null)
      return
    }
    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = 'ko-KR'
    utter.rate = 0.9
    utter.onstart = () => setSpeakingId(id)
    utter.onend = () => setSpeakingId(null)
    utter.onerror = () => setSpeakingId(null)
    utterRef.current = utter
    window.speechSynthesis.speak(utter)
  }, [speakingId])

  useEffect(() => () => window.speechSynthesis?.cancel(), [])

  return { speakingId, speak }
}

function SpeakButton({ text, id, speakingId, onSpeak }) {
  const isPlaying = speakingId === id
  return (
    <button
      onClick={() => onSpeak(text, id)}
      title={isPlaying ? '停止' : '読み上げ'}
      className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm transition
        ${isPlaying
          ? 'bg-[#A32D2D] text-white shadow-sm scale-110'
          : 'bg-gray-100 text-gray-500 hover:bg-[#A32D2D]/10 hover:text-[#A32D2D]'
        }`}
    >
      {isPlaying ? '■' : '🔊'}
    </button>
  )
}

export default function LessonDetail() {
  const router = useRouter()
  const { lessonId } = router.query
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('key')
  const [revealed, setRevealed] = useState({})
  const { speakingId, speak } = useSpeech()

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
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-xl font-bold text-[#A32D2D] flex-1">{p.kr}</p>
                          <SpeakButton text={p.kr} id={`key-${i}`} speakingId={speakingId} onSpeak={speak} />
                        </div>
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
                          <div className="flex items-center gap-2">
                            <SpeakButton text={v.kr} id={`vocab-${i}`} speakingId={speakingId} onSpeak={speak} />
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
                            <div className="flex items-center gap-2">
                              <p className="text-base font-semibold text-gray-800 flex-1">{line.kr}</p>
                              <SpeakButton text={line.kr} id={`conv-${i}`} speakingId={speakingId} onSpeak={speak} />
                            </div>
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
                            <div className="bg-[#A32D2D]/5 border border-[#A32D2D]/20 rounded-xl px-4 py-3 flex items-center gap-3">
                              <p className="text-lg font-bold text-[#A32D2D] flex-1">{ex.a}</p>
                              <SpeakButton text={ex.a} id={`ex-${i}`} speakingId={speakingId} onSpeak={speak} />
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
