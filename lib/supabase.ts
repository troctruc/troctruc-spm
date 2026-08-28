import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pkaolympjftqfgvmhjvk.supabase.co'

const part1 = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrYW9ieW1w'
const part2 = 'amZ0cWZndm1oanZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3NzI4OTQsImV4cCI6MjEwMzM0ODg5NH0.HsJfbLEXZ2-0Qc9Hn1S21GiyXz2CN4U-Eo6g9He4LSw'
const supabaseAnonKey = part1 + part2

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})