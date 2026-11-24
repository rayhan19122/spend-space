import { createClient } from '@supabase/supabase-js'
import { configProblem } from '../utils/keys.js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigProblem = configProblem(url, key)

export const supabase = supabaseConfigProblem
  ? null
  : createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
