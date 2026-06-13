import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin with service role bypass
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function parseOnboardingData(d: any) {
  if (!d || typeof d !== 'object') return {};

  let eamcet_rank = null;
  const rankStr = d.admission?.rank || d.eamcet_rank || d.eamcetRank;
  if (rankStr) {
    const parsed = parseInt(rankStr, 10);
    if (!isNaN(parsed)) {
      eamcet_rank = parsed;
    }
  }

  return {
    father_occupation: d.family?.father?.occupation || d.family?.father_occupation || d.father_occupation || d.fatherOccupation || null,
    father_education: d.family?.father?.education || d.family?.father_education || d.father_education || d.fatherEducation || null,
    father_address: d.family?.father?.address || d.family?.father_address || d.father_address || d.fatherAddress || null,
    mother_occupation: d.family?.mother?.occupation || d.family?.mother_occupation || d.mother_occupation || d.motherOccupation || null,
    mother_education: d.family?.mother?.education || d.family?.mother_education || d.mother_education || d.motherEducation || null,
    local_guardian_name: d.family?.local_guardian?.name || d.family?.guardian_name || d.local_guardian_name || d.guardianName || null,
    local_guardian_phone: d.family?.local_guardian?.contact || d.family?.local_guardian?.phone || d.family?.local_guardian_phone || d.local_guardian_phone || d.guardianPhone || null,
    local_guardian_address: d.family?.local_guardian?.address || d.family?.guardian_address || d.local_guardian_address || d.guardianAddress || null,
    local_guardian_occupation: d.family?.local_guardian?.occupation || d.family?.guardian_occupation || d.local_guardian_occupation || d.guardianOccupation || null,
    parent_email: d.identity?.parent_email || d.parent_email || d.parentEmail || null,
    residential_address: d.identity?.residential_address || d.residential_address || d.residentialAddress || null,
    eamcet_rank,
    admission_quota: d.admission?.quota || d.admission_quota || d.admissionQuota || null,
    admission_category: d.admission?.category || d.admission_category || d.admissionCategory || null,
    id_mark_1: d.identity?.identification_mark_1 || d.id_mark_1 || d.idMark1 || null,
    id_mark_2: d.identity?.identification_mark_2 || d.id_mark_2 || d.idMark2 || null,
    blood_group: d.identity?.blood_group || d.blood_group || d.bloodGroup || null,
    mobile_number: d.identity?.mobile || d.identity?.mobile_number || d.mobile_number || d.mobileNumber || null,
    father_name: d.family?.father?.name || d.family?.father_name || d.father_name || d.fatherName || null,
    father_contact_no: d.family?.father?.contact || d.family?.father?.contact_no || d.family?.father_contact_no || d.father_contact_no || d.fatherContact || null,
    mother_name: d.family?.mother?.name || d.family?.mother_name || d.mother_name || d.motherName || null,
    mother_contact_no: d.family?.mother?.contact || d.family?.mother?.contact_no || d.family?.mother_contact_no || d.mother_contact_no || d.motherContact || null
  };
}

async function runBackfill() {
  const stats = {
    total: 0,
    synced: 0,
    failed: 0,
    errors: [] as string[]
  };

  // Fetch all student onboarding profiles
  const { data: onboardingRecords, error: fetchError } = await supabaseAdmin
    .from('student_profiles')
    .select('student_id, data');

  if (fetchError) {
    throw new Error(`Failed to fetch student profiles: ${fetchError.message}`);
  }

  stats.total = onboardingRecords?.length || 0;

  for (const record of onboardingRecords || []) {
    try {
      const studentId = record.student_id;
      const parsedData = parseOnboardingData(record.data);

      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update(parsedData)
        .eq('id', studentId);

      if (updateError) {
        throw updateError;
      }

      stats.synced++;
    } catch (err: any) {
      stats.failed++;
      stats.errors.push(`Student ${record.student_id}: ${err.message}`);
    }
  }

  return stats;
}

export async function POST(request: NextRequest) {
  try {
    const isDev = process.env.NODE_ENV === 'development';
    let authorized = isDev;

    if (!authorized) {
      const supabase = await createServerClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profile?.role === 'admin') {
          authorized = true;
        }
      }
    }

    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stats = await runBackfill();
    return NextResponse.json({
      success: true,
      stats,
      message: stats.errors.length > 0 ? 'Sync completed with some errors' : 'Sync completed successfully'
    });
  } catch (error: any) {
    console.error('Sync endpoint error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const isDev = process.env.NODE_ENV === 'development';
    let authorized = isDev;

    if (!authorized) {
      const supabase = await createServerClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profile?.role === 'admin') {
          authorized = true;
        }
      }
    }

    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stats = await runBackfill();
    return NextResponse.json({
      success: true,
      stats,
      message: stats.errors.length > 0 ? 'Sync completed with some errors' : 'Sync completed successfully'
    });
  } catch (error: any) {
    console.error('Sync endpoint error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
