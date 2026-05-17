import re

files_to_process = [
    'components/mentor/ValidateMode.tsx',
    'components/mentor/ReviewMode.tsx',
    'components/mentor/SessionMode.tsx'
]

for filepath in files_to_process:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # remaining colors
    content = content.replace('text-gray-600', 'text-[#8b8b9e]')
    content = content.replace('bg-amber-100', 'bg-[rgba(245,158,11,0.08)]')
    content = content.replace('text-amber-700', 'text-[#f59e0b]')
    content = content.replace('text-green-700', 'text-[#10b981]')
    content = content.replace('text-purple-700', 'text-[#7c3aed]')
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
