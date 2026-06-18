import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function CoachProfile() {
  const router = useRouter()
  const { coachId } = router.query
  const [coach, setCoach] = useState(null)

  useEffect(() => {
    if (!coachId) return
    supabase
      .from('coaches')
      .select('*')
      .eq('id', coachId)
      .single()
      .then(({ data }) => setCoach(data))
  }, [coachId])

  if (!coach) return <p>読み込み中...</p>

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1>{coach.name}</h1>
      {coach.photo_url && <img src={coach.photo_url} alt={coach.name} style={{ width: '200px', borderRadius: '8px' }} />}
      <p>{coach.bio}</p>
      <button onClick={() => router.back()}>戻る</button>
    </div>
  )
}