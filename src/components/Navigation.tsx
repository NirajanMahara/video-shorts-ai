'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Video, Film, BarChart2 } from 'lucide-react'

const navigation = [
  { name: 'Videos', href: '/dashboard', icon: Video },
  { name: 'Shorts', href: '/shorts', icon: Film },
  { name: 'Analytics', href: '/analytics', icon: BarChart2 },
]

export default function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link
              href="/"
              className="text-xl font-bold text-indigo-600 hover:text-indigo-500"
            >
              VideoShort
            </Link>
          </div>
          <div className="flex space-x-8">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                    isActive
                      ? 'border-b-2 border-indigo-500 text-gray-900'
                      : 'border-b-2 border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {item.name}
                </Link>
              )
            })}
          </div>
          <div className="w-32"></div>
        </div>
      </div>
    </nav>
  )
} 