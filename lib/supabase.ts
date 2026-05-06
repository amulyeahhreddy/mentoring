// Re-export from the singleton client to prevent duplicates
export { getSupabaseClient } from './supabaseClient'

// Backward compatibility
import { getSupabaseClient } from './supabaseClient'
export const supabase = getSupabaseClient()
