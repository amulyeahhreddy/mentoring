export async function verifyMentorAssignment(adminClient: any, mentorId: string, studentId: string) {
  const { data: enrollments } = await adminClient
    .from('enrollments')
    .select('class_id')
    .eq('student_id', studentId);
  if (!enrollments || enrollments.length === 0) return false;
  const classIds = enrollments.map((e: any) => e.class_id);
  const { data: mentorClasses } = await adminClient
    .from('mentor_classes')
    .select('id')
    .in('class_id', classIds)
    .eq('mentor_id', mentorId)
    .limit(1);
  return mentorClasses && mentorClasses.length > 0;
}
