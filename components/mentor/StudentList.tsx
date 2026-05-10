export default function StudentList({ students, onSelect }: any) {
  return (
    <div style={{ padding: '2rem' }}>
      <h2>Students</h2>
      <ul>
        {students?.map((student: any) => (
          <li key={student.id} onClick={() => onSelect(student)} style={{ cursor: 'pointer', padding: '0.5rem', border: '1px solid #ccc', margin: '0.25rem' }}>
            {student.name}
          </li>
        ))}
      </ul>
    </div>
  )
}
