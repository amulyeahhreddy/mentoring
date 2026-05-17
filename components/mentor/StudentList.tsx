'use client'

import { useState, useMemo } from 'react';

interface StudentListProps {
  students: Array<{ id: string; name: string; email: string }>;
  selectedStudent: any;
  onSelect: (student: any) => void;
}

export default function StudentList({ students, selectedStudent, onSelect }: StudentListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStudents = useMemo(() => {
    if (!students) return [];
    if (!searchQuery.trim()) return students;
    const lowerQuery = searchQuery.toLowerCase();
    return students.filter(s => s.name?.toLowerCase().includes(lowerQuery));
  }, [students, searchQuery]);

  const getInitials = (name: string) => {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return (name[0] + (name[1] || '')).toUpperCase();
  };

  return (
    <div className="w-[256px] bg-[#1e1e2e] border-r border-white/8 flex flex-col h-full shrink-0 transition-all duration-150 ease-out">
      {/* HEADER */}
      <div className="p-4 border-b border-white/8 flex flex-col gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#4f6ef7]" />
          <span className="text-[13px] font-semibold text-[#e8e8f0]">MentorOS</span>
        </div>
        
        <div className="flex flex-col gap-1.5 mt-1">
          <span className="text-[10px] uppercase tracking-widest text-[#52525e] font-medium">Students</span>
          <div className="relative group">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#2a2a3e] border border-white/10 rounded-lg px-3 py-1.5 text-[13px] text-[#e8e8f0] placeholder-[#52525e] focus:border-[#4f6ef7]/50 outline-none transition-all"
            />
          </div>
        </div>
      </div>

      {/* STUDENT LIST */}
      <div className="flex-1 overflow-y-auto">
        {filteredStudents.length === 0 ? (
          <div className="p-8 text-center text-[#52525e] text-[13px]">
            No students found
          </div>
        ) : (
          <div className="flex flex-col py-2">
            {filteredStudents.map((student: any, index) => {
              const isActive = selectedStudent?.id === student.id;
              
              let riskColor = '';
              if (student.risk === 'low') riskColor = 'bg-[#059669]';
              else if (student.risk === 'medium') riskColor = 'bg-[#d97706]';
              else if (student.risk === 'high' || student.risk === 'critical') riskColor = 'bg-[#dc2626]';

              return (
                <div
                  key={student.id ?? student.email ?? index}
                  onClick={() => onSelect(student)}
                  className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-all border-l-2 ${
                    isActive 
                      ? 'bg-[rgba(79,110,247,0.12)] border-[#4f6ef7]' 
                      : 'border-transparent hover:bg-white/4'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4f6ef7] to-[#7c3aed] text-white text-[11px] font-semibold flex items-center justify-center shrink-0">
                    {getInitials(student.name)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-[#e8e8f0] truncate">
                      {student.name}
                    </div>
                    <div className="text-[11px] text-[#52525e] truncate">
                      {student.email}
                    </div>
                  </div>

                  {riskColor && (
                    <div className={`w-2 h-2 rounded-full ${riskColor} shrink-0`} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="p-3 border-t border-white/8 shrink-0 flex justify-center">
        <span className="text-[10px] text-[#52525e]">MentorOS</span>
      </div>
    </div>
  );
}
