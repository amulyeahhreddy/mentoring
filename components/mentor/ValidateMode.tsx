export default function ValidateMode({ student, session, aiOutput }: any) {
  return (
    <div style={{ padding: '2rem' }}>
      <h2>Validate & Submit</h2>
      <p>Student: {student?.name}</p>
    </div>
  )
}
