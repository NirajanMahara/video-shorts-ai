import { auth } from '@clerk/nextjs'
import { redirect } from 'next/navigation'
import VideoUpload from '@/components/VideoUpload'

export default function Home() {
  const { userId } = auth()

  if (!userId) {
    redirect('/sign-in')
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">
        Transform Your Videos into Engaging Shorts
      </h1>
      <div className="max-w-2xl mx-auto">
        <VideoUpload />
      </div>
    </div>
  )
}
