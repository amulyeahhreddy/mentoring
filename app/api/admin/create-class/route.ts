import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const adminClient = createAdminClient()

    const body = await request.json()
    const { name } = body

    if (!name) {
      return NextResponse.json({ error: 'Class name is required' }, { status: 400 })
    }

    // Generate unique class code
    const generateClassCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      let code = ''
      for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)]
      }
      return code
    }

    let class_code = generateClassCode()
    let attempts = 0
    const maxAttempts = 5

    // Check uniqueness and regenerate if needed
    while (attempts < maxAttempts) {
      const { data: existingClass } = await adminClient
        .from('classes')
        .select('class_code')
        .eq('class_code', class_code)
        .single()

      if (!existingClass) break
      
      class_code = generateClassCode()
      attempts++
    }

    if (attempts >= maxAttempts) {
      return NextResponse.json({ error: 'Failed to generate unique class code' }, { status: 500 })
    }

    // Insert class
    const { data: newClass, error: classError } = await adminClient
      .from('classes')
      .insert({
        name,
        class_code,
        created_by_admin_id: user.id
      })
      .select()
      .single()

    if (classError) {
      return NextResponse.json({ error: classError.message }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      class: { 
        id: newClass.id, 
        name: newClass.name, 
        class_code: newClass.class_code 
      } 
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
