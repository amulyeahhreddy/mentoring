import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabaseClient'

export async function POST(request: NextRequest) {
  console.log('🔍 API: get-profile called')
  
  try {
    // Parse JSON body safely
    let body
    try {
      body = await request.json()
      console.log('🔍 API: Request body:', body)
    } catch (parseError) {
      console.error('🔍 API: JSON parse error:', parseError)
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    const { userId } = body

    if (!userId) {
      console.log('🔍 API: Missing userId')
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    console.log('🔍 API: Fetching profile for userId:', userId)

    // Get Supabase client
    const supabase = getSupabaseClient()

    // Fetch profile
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    console.log('🔍 API: Supabase response - data:', data, 'error:', error)

    if (error) {
      console.error('🔍 API: Profile fetch error:', error)
      return NextResponse.json(
        { error: 'Profile not found', details: error.message },
        { status: 404 }
      )
    }

    if (!data) {
      console.log('🔍 API: No profile data found')
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    console.log('🔍 API: Profile found:', data)
    return NextResponse.json({ profile: data })
  } catch (error) {
    console.error('🔍 API: Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
