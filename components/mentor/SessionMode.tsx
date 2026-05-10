export default function SessionMode({ student, session }: any) {
  return (
    <div style={{ padding: '2rem' }}>
      <h2>Session Form</h2>
      <p>Student: {student?.name}</p>
    </div>
  )
}
