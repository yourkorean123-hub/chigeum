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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Server configuration error' })
  }

  const {
    userId,
    course,
    frequency,
    duration,
    contact,
    callMethod,
    name,
    furigana,
  } = req.body

  if (!userId || !course || !frequency || !duration) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const profilePayload = {
    id: userId,
    role: 'student',
    course,
    frequency,
    duration,
    name,
    furigana,
  }

  if (callMethod === 'line' && contact) {
    profilePayload.line_id = contact
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .upsert(profilePayload)

  if (error) {
    console.error('[register-profile] failed:', error)
    return res.status(500).json({ error: error.message })
  }

  return res.status(200).json({ success: true })
}
