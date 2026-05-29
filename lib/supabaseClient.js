import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://thltfzhijutuxnlzhkre.supabase.co'
const supabaseAnonKey = 'sb_publishable_OradGxwAcqjKYKVLtcQpqw_R6oKkcDE'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
