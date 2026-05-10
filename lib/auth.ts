// lib/auth.ts
import { supabase } from '@/lib/supabase'

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Optional: redirect after email confirmation
      emailRedirectTo: `${location.origin}/auth/callback`,
    },
  })

  if (error) {
    // Log the FULL error object during debugging
    console.error('Signup error:', JSON.stringify(error, null, 2))
    throw error
  }

  // Profile is created automatically by the DB trigger.
  // data.user will exist; data.session may be null if email confirmation is required.
  return data
}
