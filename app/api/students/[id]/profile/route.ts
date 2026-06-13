import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const adminClient = (await import('@/lib/supabase/admin')).createAdminClient();
  const { data, error } = await adminClient
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const adminClient = (await import('@/lib/supabase/admin')).createAdminClient();

  const { data: caller } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isSelf = user.id === id;
  const isAdmin = caller?.role === 'admin';
  const isMentor = caller?.role === 'mentor';

  if (!isSelf && !isAdmin && !isMentor) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Whitelist — never allow id, role, or email to be changed
  const UPDATABLE_FIELDS = [
    'name', 'roll_number_formatted', 'eamcet_rank', 'admission_quota',
    'admission_category', 'id_mark_1', 'id_mark_2', 'blood_group',
    'mobile_number', 'personal_email', 'parent_email', 'residential_address',
    'father_name', 'father_occupation', 'father_education', 'father_address',
    'father_contact_no', 'mother_name', 'mother_occupation', 'mother_education',
    'mother_contact_no', 'local_guardian_name', 'local_guardian_occupation',
    'local_guardian_address', 'local_guardian_phone',
  ];

  const body = await req.json();
  const sanitized: Record<string, unknown> = {};
  for (const key of UPDATABLE_FIELDS) {
    if (key in body) sanitized[key] = body[key];
  }

  if (Object.keys(sanitized).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { data, error } = await adminClient
    .from('profiles')
    .update(sanitized)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
