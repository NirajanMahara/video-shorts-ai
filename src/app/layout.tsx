import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Navigation from '@/components/Navigation'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'VideoShort - Transform Videos into Engaging Shorts',
  description: 'Transform your long-form videos into engaging short-form content optimized for social media.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          <Navigation />
          <main className="min-h-screen bg-gray-50">
            {children}
          </main>
        </body>
      </html>
    </ClerkProvider>
  )
}
