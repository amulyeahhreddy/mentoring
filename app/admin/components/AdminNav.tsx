'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItem {
  label: string
  href: string
  icon: string
}

export default function AdminNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname()

  return (
    <nav className="flex-1 p-6 space-y-8">
      <div className="space-y-1">
        <span className="text-[10px] font-medium text-[#52525e] uppercase tracking-widest ml-2 mb-3 block">
          Management
        </span>
        <ul className="space-y-1">
          {items.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group ${
                    isActive
                      ? 'bg-[rgba(79,110,247,0.15)] border-l-2 border-[#4f6ef7] text-[#e8e8f0]'
                      : 'hover:bg-white/5 text-[#9090a0] hover:text-[#e8e8f0]'
                  }`}
                >
                  <i 
                    className={`ti ${item.icon} text-[16px] transition-colors ${
                      isActive ? 'text-[#4f6ef7]' : 'text-[#9090a0] group-hover:text-[#e8e8f0]'
                    }`}
                  ></i>
                  <span className={`text-[13px] font-medium transition-colors ${
                    isActive ? 'text-[#e8e8f0]' : 'text-[#9090a0] group-hover:text-[#e8e8f0]'
                  }`}>
                    {item.label}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}
