'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { Upload, LayoutDashboard } from 'lucide-react'

export default function Navbar() {
  const pathname = usePathname()

  const isActive = (path: string) => {
    return pathname === path
      ? 'bg-indigo-700 text-white'
      : 'text-gray-300 hover:bg-indigo-600 hover:text-white'
  }

  return (
    <nav className="bg-indigo-800 shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link
              href="/"
              className="flex items-center space-x-2 text-white font-bold text-xl hover:text-indigo-200 transition-colors"
            >
              <span className="text-2xl">🎬</span>
              <span>VideoShort</span>
            </Link>
            <div className="ml-10 flex items-baseline space-x-4">
              <Link
                href="/"
                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${isActive(
                  '/'
                )}`}
              >
                <Upload size={18} />
                <span>Upload</span>
              </Link>
              <Link
                href="/dashboard"
                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${isActive(
                  '/dashboard'
                )}`}
              >
                <LayoutDashboard size={18} />
                <span>Dashboard</span>
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <UserButton 
              afterSignOutUrl="/sign-in"
              appearance={{
                elements: {
                  avatarBox: "w-10 h-10 rounded-full border-2 border-white hover:border-indigo-200 transition-colors"
                }
              }}
            />
          </div>
        </div>
      </div>
    </nav>
  )
} 