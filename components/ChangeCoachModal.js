import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土']

function toDateKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function buildStartDateOptions() {
  const options = []
  const base = new Date()
  base.setHours(0, 0, 0, 0)
  for (let i = 2; i <= 28; i += 1) {
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i)
    options.push(d)
  }
  return options
}

export default function ChangeCoachModal({ studentId, currentCoachId, profile, onClose, onDone }) {
  const [step, setStep] = useState('coach') // coach → slots → start → confirm
  const [coaches, setCoaches] = useState([])
  const [loadingCoaches, setLoadingCoaches] = useState(true)
  const [selectedCoach, setSelectedCoach] = useState(null)
  const [schedule, setSchedule] = useState([])
  const [bookedSlots, setBookedSlots] = useState([])
  const [loadingSchedule, setLoadingSchedule] = useState(false)
  const [selectedSlots, setSelectedSlots] = useState({})
  const [startDate, setStartDate] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // フレックス（回数制）かどうか。フレックスは曜日固定の予約を持たないため、
  // コーチ変更はコーチを選ぶだけで完了する（枠選択・開始日選択は不要）。
  const isFlex = profile?.plan_type === 'flex'

  const parseDurationFromCourse = (course) => {
    if (!course) return 10
    const match = course.match(/(\d+)/)
    if (!match) return 10
    return Number(match[1]) || 10
  }
  const durationMin = parseDurationFromCourse(profile?.course)

  const getWeeklyLimit = (frequency) => {
    return { weekly1: 1, weekly2: 2, weekly3: 3, daily: 7 }[frequency] || 0
  }
  const maxSelectableSlots = getWeeklyLimit(profile?.frequency)
  const selectedCount = Object.keys(selectedSlots).length
  const remainingSlots = Math.max(maxSelectableSlots - selectedCount, 0)
  const isSlotSelectionComplete = maxSelectableSlots > 0 && selectedCount === maxSelectableSlots

  const startDateOptions = buildStartDateOptions()

  // コーチ一覧を読み込む（現在のコーチは除外、有効なコーチのみ）
  useEffect(() => {
    supabase
      .from('coaches')
      .select('id, name, photo_url, bio, tags')
      .eq('is_active', true)
      .order('display_order')
      .then(({ data }) => {
        const list = (data || []).filter((c) => c.id !== currentCoachId)
        setCoaches(list)
        setLoadingCoaches(false)
      })
  }, [currentCoachId])

  // フレックス：コーチを選んだら即変更する（枠選択なし）
  const handleSelectCoachFlex = async (coach) => {
    if (submitting) return
    setSelectedCoach(coach)
    setSubmitting(true)
    setErrorMsg('')

    const { data, error } = await supabase.rpc('change_coach_flex', {
      p_student_id: studentId,
      p_new_coach_id: coach.id,
    })

    if (error || !data?.success) {
      console.error('[ChangeCoachModal] change_coach_flex failed:', error || data)
      setErrorMsg('変更に失敗しました。もう一度お試しください。')
      setSubmitting(false)
      return
    }

    // 新コーチへ通知メールを送る（失敗しても変更自体は成立させる）
    try {
      await fetch('/api/notify-coach-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, newCoachId: coach.id }),
      })
    } catch (e) {
      console.error('[ChangeCoachModal] notify failed:', e)
    }

    setSubmitting(false)
    onDone?.()
  }

  // コーチを選んだら、そのコーチの空き時間と予約済み枠を読み込む（固定コース用）
  const handleSelectCoach = async (coach) => {
    setSelectedCoach(coach)
    setSelectedSlots({})
    setStartDate(null)
    setErrorMsg('')
    setLoadingSchedule(true)
    setStep('slots')

    const response = await fetch(`/api/coach-booked-slots?coachId=${coach.id}`)
    if (response.ok) {
      const result = await response.json()
      setBookedSlots(result.bookedSlots || [])
    } else {
      setBookedSlots([])
    }

    const { data: slots } = await supabase
      .from('coach_schedule')
      .select('*')
      .eq('coach_id', coach.id)
      .eq('is_open', true)
      .order('day_of_week')
      .order('hour')
      .order('minute')
    setSchedule(slots || [])
    setLoadingSchedule(false)
  }

  const GROUPED_SCHEDULE = schedule.reduce((acc, slot) => {
    const key = slot.day_of_week
    if (!acc[key]) acc[key] = []
    acc[key].push(slot)
    return acc
  }, {})

  const buildAvailableStarts = (slots = [], durationMinutes) => {
    const step = 10
    const needCount = Math.ceil(durationMinutes / step)
    const sorted = [...slots].sort((a, b) => (a.hour * 60 + a.minute) - (b.hour * 60 + b.minute))
    const openSet = new Set(sorted.map(({ hour, minute }) => `${hour}-${minute}`))
    return sorted.filter(({ hour, minute }) => {
      let currentHour = hour
      let currentMinute = minute
      for (let i = 1; i < needCount; i += 1) {
        currentMinute += step
        if (currentMinute >= 60) {
          currentHour += 1
          currentMinute -= 60
        }
        if (!openSet.has(`${currentHour}-${currentMinute}`)) return false
      }
      return true
    })
  }

  const toMinutes = (hour, minute) => (hour * 60) + minute

  const slotsOverlap = (aStartMin, aDurMin, bStartMin, bDurMin) => {
    const aEnd = aStartMin + (aDurMin || 0)
    const bEnd = bStartMin + (bDurMin || 0)
    return aStartMin < bEnd && bStartMin < aEnd
  }

  const isSlotBooked = (slot) => {
    if (!bookedSlots || bookedSlots.length === 0) return false
    const sStart = toMinutes(slot.hour, slot.minute)
    return bookedSlots.some((b) => {
      if (Number(b.day_of_week) !== Number(slot.day_of_week)) return false
      const bStart = toMinutes(b.hour, b.minute)
      const bDur = b.duration_min ?? durationMin
      return slotsOverlap(sStart, durationMin, bStart, bDur)
    })
  }

  const availableStartsByDay = Object.fromEntries(
    Object.entries(GROUPED_SCHEDULE).map(([day, slots]) => [day, buildAvailableStarts(slots, durationMin)])
  )
  const visibleDays = Object.keys(availableStartsByDay).map((day) => Number(day)).sort((a, b) => a - b)

  // 変更を確定する（固定コース用：RPCを呼ぶ）
  const handleConfirm = async () => {
    if (!isSlotSelectionComplete || !startDate || !selectedCoach) return
    setSubmitting(true)
    setErrorMsg('')

    const slotsPayload = Object.values(selectedSlots).map((slot) => ({
      day_of_week: slot.day_of_week,
      hour: slot.hour,
      minute: slot.minute,
      duration_min: durationMin,
    }))

    const { error } = await supabase.rpc('change_coach_atomic', {
      p_student_id: studentId,
      p_new_coach_id: selectedCoach.id,
      p_new_slots: slotsPayload,
      p_start_date: toDateKey(startDate),
    })

    if (error) {
      console.error('[ChangeCoachModal] change_coach_atomic failed:', error)
      setErrorMsg('変更に失敗しました。もう一度お試しください。')
      setSubmitting(false)
      return
    }

    // 新コーチへ通知メールを送る（失敗しても変更自体は成立させる）
    try {
      await fetch('/api/notify-coach-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          newCoachId: selectedCoach.id,
        }),
      })
    } catch (e) {
      console.error('[ChangeCoachModal] notify failed:', e)
    }

    setSubmitting(false)
    onDone?.()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h3 className="font-bold text-[#0C447C]">コーチを変更する</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="p-5">
          {errorMsg && <p className="text-sm text-red-500 mb-4">{errorMsg}</p>}

          {/* STEP 1: コーチ選択 */}
          {step === 'coach' && (
            <div>
              <p className="text-sm text-gray-500 mb-4">
                新しいコーチを選んでください。
                {isFlex && '（回数チケットはそのまま引き継がれます）'}
              </p>
              {isFlex && (
                <div className="bg-[#EEF4FB] border border-[#D3E2F3] rounded-2xl p-3 mb-4">
                  <p className="text-xs text-[#0C447C]">
                    コーチを選ぶと、その場で担当が切り替わります。今のコーチにこれからのフレックス予約が入っている場合は取り消され、その回数分のチケットは戻ります。
                  </p>
                </div>
              )}
              {loadingCoaches ? (
                <p className="text-sm text-gray-400">読み込み中...</p>
              ) : coaches.length === 0 ? (
                <p className="text-sm text-gray-400">変更できるコーチがいません。</p>
              ) : (
                <div className="space-y-3">
                  {coaches.map((coach) => (
                    <button
                      key={coach.id}
                      onClick={() => (isFlex ? handleSelectCoachFlex(coach) : handleSelectCoach(coach))}
                      disabled={submitting}
                      className="w-full text-left bg-white rounded-2xl border border-gray-200 hover:border-[#A32D2D] shadow-sm p-4 transition flex gap-3 items-center disabled:opacity-50"
                    >
                      {coach.photo_url ? (
                        <img src={coach.photo_url} alt={coach.name} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-xl">👤</div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-[#0C447C]">{coach.name}</p>
                        {coach.bio && <p className="text-xs text-gray-500 truncate">{coach.bio}</p>}
                      </div>
                      {isFlex && (
                        <span className="text-xs text-[#A32D2D] font-semibold flex-shrink-0">
                          {submitting && selectedCoach?.id === coach.id ? '変更中...' : 'このコーチにする →'}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: 枠選び（固定コースのみ） */}
          {step === 'slots' && (
            <div>
              <button onClick={() => setStep('coach')} className="text-xs text-gray-400 hover:text-gray-600 mb-3">← コーチを選び直す</button>
              <p className="text-sm font-semibold text-[#0C447C] mb-1">{selectedCoach?.name} さんの空き時間</p>
              {maxSelectableSlots > 0 && (
                <p className="text-xs text-gray-500 mb-4">
                  週{maxSelectableSlots}回のプランです。
                  {isSlotSelectionComplete ? '（選択完了）' : `あと${remainingSlots}枠選んでください。`}
                </p>
              )}

              {loadingSchedule ? (
                <p className="text-sm text-gray-400">読み込み中...</p>
              ) : schedule.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-center text-sm text-yellow-700">
                  このコーチはまだ空き時間を登録していません。
                </div>
              ) : (
                <div className="space-y-4">
                  {visibleDays.map((day) => {
                    const dayKey = String(day)
                    const daySlots = availableStartsByDay[dayKey] || []
                    const selectedSlot = selectedSlots[dayKey]
                    return (
                      <div key={day} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                        <p className="font-bold text-[#0C447C] text-sm mb-3">{DAY_NAMES[day]}曜日</p>
                        <div className="flex flex-wrap gap-2">
                          {daySlots.length === 0 ? (
                            <p className="text-sm text-gray-400">空き時間なし</p>
                          ) : (
                            daySlots.map((slot) => {
                              const slotWithDay = { ...slot, day_of_week: Number(day) }
                              const slotKey = `${day}-${slot.hour}-${slot.minute}`
                              const selectedStart = selectedSlot ? selectedSlot.hour * 60 + selectedSlot.minute : null
                              const slotTime = slot.hour * 60 + slot.minute
                              const isSelected = selectedStart !== null && slotTime >= selectedStart && slotTime < selectedStart + durationMin
                              const isBooked = isSlotBooked(slotWithDay)
                              const disableByLimit = !isSelected && selectedCount >= maxSelectableSlots && maxSelectableSlots > 0
                              return (
                                <button
                                  key={slotKey}
                                  type="button"
                                  onClick={() => {
                                    if (isBooked || disableByLimit) return
                                    setSelectedSlots((prev) => {
                                      const existing = prev[day]
                                      if (existing?.hour === slot.hour && existing?.minute === slot.minute) {
                                        const next = { ...prev }
                                        delete next[day]
                                        return next
                                      }
                                      return { ...prev, [day]: { ...slotWithDay } }
                                    })
                                  }}
                                  disabled={isBooked || disableByLimit}
                                  className={`rounded-xl px-3 py-1.5 text-sm font-semibold border transition ${isSelected ? 'bg-[#A32D2D] text-white border-[#A32D2D]' : isBooked || disableByLimit ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-200 hover:border-[#A32D2D]'}`}
                                >
                                  {String(slot.hour).padStart(2, '0')}:{String(slot.minute).padStart(2, '0')}
                                  {isBooked && <span className="ml-1 text-[10px] text-gray-500">満</span>}
                                </button>
                              )
                            })
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {isSlotSelectionComplete && (
                <button
                  onClick={() => setStep('start')}
                  className="w-full mt-5 rounded-xl bg-[#0C447C] text-white font-bold py-3 hover:opacity-90 transition"
                >
                  開始日の選択へ進む
                </button>
              )}
            </div>
          )}

          {/* STEP 3: 開始日（固定コースのみ） */}
          {step === 'start' && (
            <div>
              <button onClick={() => setStep('slots')} className="text-xs text-gray-400 hover:text-gray-600 mb-3">← 時間を選び直す</button>
              <p className="font-bold text-[#0C447C] mb-1">新しい開始日</p>
              <p className="text-xs text-gray-500 mb-3">この日付以降の、選んだ曜日から新しいコーチの練習が始まります。</p>
              <div className="flex flex-wrap gap-2">
                {startDateOptions.map((d) => {
                  const key = toDateKey(d)
                  const isSelected = startDate && toDateKey(startDate) === key
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setStartDate(d)}
                      className={`rounded-xl px-3 py-1.5 text-sm font-semibold border transition ${isSelected ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-200 hover:border-green-500'}`}
                    >
                      {d.getMonth() + 1}/{d.getDate()}（{DAY_NAMES[d.getDay()]}）
                    </button>
                  )
                })}
              </div>
              {startDate && (
                <button
                  onClick={() => setStep('confirm')}
                  className="w-full mt-5 rounded-xl bg-[#0C447C] text-white font-bold py-3 hover:opacity-90 transition"
                >
                  確認へ進む
                </button>
              )}
            </div>
          )}

          {/* STEP 4: 確認（固定コースのみ） */}
          {step === 'confirm' && (
            <div>
              <button onClick={() => setStep('start')} className="text-xs text-gray-400 hover:text-gray-600 mb-3">← 開始日を選び直す</button>
              <div className="bg-[#EEF4FB] border border-[#D3E2F3] rounded-2xl p-4 mb-4">
                <p className="text-sm font-bold text-[#0C447C] mb-2">この内容で変更します</p>
                <p className="text-sm text-gray-700">新しいコーチ：<span className="font-semibold">{selectedCoach?.name}</span></p>
                <div className="text-sm text-gray-700 mt-1">
                  練習時間：
                  {Object.values(selectedSlots).map((slot, i) => {
                    const start = `${String(slot.hour).padStart(2, '0')}:${String(slot.minute).padStart(2, '0')}`
                    return (
                      <span key={i} className="inline-block ml-1">
                        {DAY_NAMES[slot.day_of_week]} {start}{i < Object.values(selectedSlots).length - 1 ? '、' : ''}
                      </span>
                    )
                  })}
                </div>
                <p className="text-sm text-gray-700 mt-1">開始日：{startDate.getFullYear()}年{startDate.getMonth() + 1}月{startDate.getDate()}日（{DAY_NAMES[startDate.getDay()]}）</p>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-3 mb-4">
                <p className="text-xs text-yellow-700">
                  今のコーチの予約は取り消され、新しいコーチの予約に切り替わります。追加のお支払いはありません。
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={submitting}
                  className="flex-1 rounded-xl border border-gray-200 py-3 text-sm text-gray-500 hover:bg-gray-50 transition disabled:opacity-50"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-[#A32D2D] text-white font-bold py-3 hover:opacity-90 transition disabled:opacity-50"
                >
                  {submitting ? '変更中...' : 'この内容で変更する'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}