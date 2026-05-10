export default function ReviewMode({ student, session }: any) {
  return (
    <div style={{ padding: '2rem' }}>
      <h2>Review</h2>
      <p>Student: {student?.name}</p>
    </div>
  )
}
