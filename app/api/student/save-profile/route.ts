import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

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

export async function POST(request: NextRequest) {
  try {
    const { student_id, data, is_complete } = await request.json()
    
    if (!student_id || !data) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
    
    const adminClient = createAdminClient()
    
    const { error } = await adminClient
      .from('student_profiles')
      .upsert({
        student_id,
        data,
        ...(is_complete ? { completed_at: new Date().toISOString() } : {})
      }, { onConflict: 'student_id' })
      
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Sync to profiles table directly
    const parsedData = parseOnboardingData(data)
    await adminClient
      .from('profiles')
      .update(parsedData)
      .eq('id', student_id)
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
