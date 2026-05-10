export default function BriefingMode({ student, session }: any) {
  return (
    <div style={{ padding: '2rem' }}>
      <h2>Briefing</h2>
      <p>Student: {student?.name}</p>
    </div>
  )
}
