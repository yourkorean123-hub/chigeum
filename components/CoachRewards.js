import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

// 報酬単価（コーチ画面 pages/dashboard/coach.js の rewardForReview と同じ計算）
// 通常レッスンは10分あたり ¥500（10分=¥500 / 20分=¥1,000）、欠席は一律 ¥200。
const REWARD_NORMAL = 500
const REWARD_ABSENT = 200

// レビュー1件の報酬額。duration_min が未記録の旧データは10分とみなす。
function rewardForReview(review) {
  if (review.is_absent) return REWARD_ABSENT
  const dur = review.duration_min || 10
  return Math.round(dur / 10) * REWARD_NORMAL
}

export default function CoachRewards() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  useEffect(() => {
    const load = async () => {
      setLoading(true)

      const { data: coachRows } = await supabase
        .from('coaches')
        .select('id, name, is_active')
        .order('name')

      const { data: reviewRows, error } = await supabase
        .from('reviews')
        .select('id, coach_id, lesson_date, created_at, is_absent, duration_min')

      if (error) console.error('[admin-rewards] fetch reviews failed:', error)

      const filtered = (reviewRows || []).filter((r) => {
        const dateStr = r.lesson_date || r.created_at?.slice(0, 10)
        return dateStr && dateStr.startsWith(selectedMonth)
      })

      const summary = (coachRows || []).map((c) => {
        const mine = filtered.filter((r) => r.coach_id === c.id)
        let count10 = 0
        let count20 = 0
        let absentCount = 0
        mine.forEach((r) => {
          if (r.is_absent) { absentCount++; return }
          if ((r.duration_min || 10) >= 20) count20++
          else count10++
        })
        return {
          id: c.id,
          name: c.name || '未登録',
          isActive: c.is_active,
          count10,
          count20,
          absentCount,
          reward: mine.reduce((sum, r) => sum + rewardForReview(r), 0),
        }
      })

      setRows(summary)
      setLoading(false)
    }

    load()
  }, [selectedMonth])

  const monthOptions = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    monthOptions.push({
      val: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: `${d.getFullYear()}年${d.getMonth() + 1}月`,
    })
  }

  const total = rows.reduce((s, r) => s + r.reward, 0)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-semibold text-gray-600">対象月：</label>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0C447C]/40"
        >
          {monthOptions.map((o) => (
            <option key={o.val} value={o.val}>{o.label}</option>
          ))}
        </select>
        <div className="flex-1" />
        <span className="text-sm font-semibold text-[#A32D2D]">支払総額 ¥{total.toLocaleString()}</span>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">読み込み中...</p>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
          <p className="text-4xl mb-4">🧾</p>
          <p className="text-gray-400 text-sm">コーチが登録されていません</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-[680px] w-full text-sm border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="bg-gray-100 text-gray-600 font-semibold px-3 py-2.5 text-left border-b border-gray-200">コーチ名</th>
                  <th className="bg-gray-100 text-gray-600 font-semibold px-3 py-2.5 text-right border-b border-gray-200">10分</th>
                  <th className="bg-gray-100 text-gray-600 font-semibold px-3 py-2.5 text-right border-b border-gray-200">20分</th>
                  <th className="bg-gray-100 text-gray-600 font-semibold px-3 py-2.5 text-right border-b border-gray-200">欠席</th>
                  <th className="bg-gray-100 text-gray-600 font-semibold px-3 py-2.5 text-right border-b border-gray-200">報酬合計</th>
                  <th className="bg-gray-100 text-gray-600 font-semibold px-3 py-2.5 text-left border-b border-gray-200">状態</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="odd:bg-white even:bg-[#F6FAFF] hover:bg-[#F0F7FF] transition">
                    <td className="px-3 py-3 text-gray-800 font-medium border-b border-gray-100 whitespace-nowrap">{r.name}</td>
                    <td className="px-3 py-3 text-gray-600 border-b border-gray-100 text-right whitespace-nowrap">{r.count10}</td>
                    <td className="px-3 py-3 text-gray-600 border-b border-gray-100 text-right whitespace-nowrap">{r.count20}</td>
                    <td className="px-3 py-3 text-orange-500 border-b border-gray-100 text-right whitespace-nowrap">{r.absentCount}</td>
                    <td className="px-3 py-3 text-[#A32D2D] font-bold border-b border-gray-100 text-right whitespace-nowrap">¥{r.reward.toLocaleString()}</td>
                    <td className="px-3 py-3 border-b border-gray-100 whitespace-nowrap">
                      {r.isActive ? (
                        <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">稼働中</span>
                      ) : (
                        <span className="text-xs bg-gray-100 text-gray-500 font-semibold px-2 py-0.5 rounded-full">停止中</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400">10分レッスン ¥500 ／ 20分レッスン ¥1,000 ／ 欠席処理 ¥{REWARD_ABSENT} で計算されます（コーチ画面と同じ計算）。</p>
    </div>
  )
}