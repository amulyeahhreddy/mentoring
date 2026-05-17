import re

with open('components/mentor/SessionMode.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace specific background and layout container
content = content.replace('className="flex flex-col h-full bg-white relative"', 'className="flex flex-col h-full bg-[#0a0a0f] text-[#f0f0f5] relative font-sans"')

# Backgrounds
content = content.replace('bg-white', 'bg-[#111118]')
content = content.replace('bg-gray-950', 'bg-[#0a0a0f]')
content = content.replace('bg-gray-50', 'bg-[#0d0d14]')
content = content.replace('bg-gray-100', 'bg-[#16161f]')
content = content.replace('bg-blue-50', 'bg-[rgba(79,110,247,0.08)]')
content = content.replace('bg-purple-50', 'bg-[rgba(124,58,237,0.08)]')
content = content.replace('bg-amber-50', 'bg-[rgba(245,158,11,0.08)]')
content = content.replace('bg-red-50/50', 'bg-[rgba(239,68,68,0.08)]')
content = content.replace('bg-gray-800', 'bg-[#16161f]')

# Borders
content = content.replace('border-gray-200', 'border-[rgba(255,255,255,0.06)]')
content = content.replace('border-gray-300', 'border-[rgba(255,255,255,0.10)]')
content = content.replace('border-gray-100', 'border-[rgba(255,255,255,0.06)]')
content = content.replace('border-blue-100', 'border-[rgba(79,110,247,0.15)]')
content = content.replace('border-purple-100', 'border-[rgba(124,58,237,0.15)]')
content = content.replace('border-amber-100', 'border-[rgba(245,158,11,0.15)]')
content = content.replace('border-red-100', 'border-[rgba(239,68,68,0.15)]')

# Text Colors
content = content.replace('text-gray-800', 'text-[#f0f0f5]')
content = content.replace('text-gray-700', 'text-[#f0f0f5]')
content = content.replace('text-gray-500', 'text-[#8b8b9e]')
content = content.replace('text-gray-400', 'text-[#8b8b9e]')
content = content.replace('text-gray-300', 'text-[#4f4f62]')
content = content.replace('text-blue-600', 'text-[#4f6ef7]')
content = content.replace('text-blue-800', 'text-[#4f6ef7]')
content = content.replace('text-blue-500', 'text-[#4f6ef7]')
content = content.replace('text-purple-600', 'text-[#7c3aed]')
content = content.replace('text-purple-800', 'text-[#7c3aed]')
content = content.replace('text-purple-500', 'text-[#7c3aed]')
content = content.replace('text-amber-400', 'text-[#f59e0b]')
content = content.replace('text-amber-600', 'text-[#f59e0b]')
content = content.replace('text-emerald-600', 'text-[#10b981]')

# Hover / Focus Rings
content = content.replace('focus:ring-blue-500', 'focus:ring-[rgba(79,110,247,0.15)] focus:border-[#4f6ef7]')
content = content.replace('focus:ring-purple-500', 'focus:ring-[rgba(124,58,237,0.15)] focus:border-[#7c3aed]')
content = content.replace('focus:ring-red-200', 'focus:ring-[rgba(239,68,68,0.15)] focus:border-[#ef4444]')
content = content.replace('hover:bg-blue-50', 'hover:bg-[#16161f]')
content = content.replace('hover:bg-purple-50', 'hover:bg-[#16161f]')
content = content.replace('shadow-emerald-200', 'shadow-[0_0_15px_rgba(16,185,129,0.2)]')

with open('components/mentor/SessionMode.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
