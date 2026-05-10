import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const session_id = searchParams.get('session_id')
    if (!session_id) return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })
    const adminClient = createAdminClient()
    const { data: session, error } = await adminClient
      .from('sessions')
      .select('*')
      .eq('id', session_id)
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ session })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
