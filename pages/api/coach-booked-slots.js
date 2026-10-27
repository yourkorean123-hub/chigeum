import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabaseAdmin = serviceRoleKey && supabaseUrl
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Server configuration error' })
  }

  const coachId = req.query.coachId

  if (!coachId) {
    return res.status(400).json({ error: 'Missing coachId' })
  }

  const { data, error } = await supabaseAdmin
    .from('lesson_bookings')
    .select('coach_id, student_id, day_of_week, hour, minute, duration_min, status')
    .eq('coach_id', coachId)
    .neq('status', 'cancelled')

  if (error) {
    console.error('[coach-booked-slots] failed:', error)
    return res.status(500).json({ error: error.message })
  }

  return res.status(200).json({ bookedSlots: data || [] })
}