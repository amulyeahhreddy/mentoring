import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { student_id, class_code } = await request.json()
    
    if (!student_id || !class_code) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
    
    const adminClient = createAdminClient()
    
    const { data: cls } = await adminClient
      .from('classes')
      .select('id, name')
      .ilike('class_code', class_code)
      .maybeSingle()
      
    if (!cls) {
      return NextResponse.json({ error: 'Class code not found' }, { status: 404 })
    }
    
    const { data: existing } = await adminClient
      .from('enrollments')
      .select('id')
      .eq('student_id', student_id)
      .eq('class_id', cls.id)
      .maybeSingle()
      
    if (existing) {
      return NextResponse.json({ error: 'Already enrolled in this class' }, { status: 400 })
    }
    
    await adminClient.from('enrollments').insert({ student_id, class_id: cls.id })
    
    const { data: mc } = await adminClient
      .from('mentor_classes')
      .select('mentor_id, profiles(name)')
      .eq('class_id', cls.id)
      .maybeSingle()
      
    const mentor_name = (mc?.profiles as any)?.name || 'Not assigned'
    
    return NextResponse.json({ success: true, class_name: cls.name, mentor_name })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
