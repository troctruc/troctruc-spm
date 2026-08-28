import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pkaolympjftqfgvmhjvk.supabase.co'
const supabaseAnonKey = 'sb_publishable_14w5oDDdi17BsUsE_10XCAg_hmVgac3G'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})