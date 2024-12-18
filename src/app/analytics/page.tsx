'use client'

import { useEffect, useState } from 'react'
import { PieChart, BarChart, Activity, HardDrive } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  description: string
  icon: React.ReactNode
  trend?: {
    value: number
    label: string
  }
}

interface AnalyticsData {
  overview: {
    successRate: string
    totalVideos: number
    processingTime: string
    storageUsed: string
  }
  trends: {
    successRate: number
    totalVideos: number
    processingTime: number
    storageUsed: number
  }
  recentActivity: Array<{
    id: string
    title: string
    status: string
    updatedAt: string
  }>
  processingStats: {
    successRate: number
    processingSpeed: number
    storageEfficiency: number
  }
}

function StatCard({ title, value, description, icon, trend }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
        </div>
        <div className="p-3 bg-indigo-50 rounded-lg">
          {icon}
        </div>
      </div>
      <div className="mt-4">
        <p className="text-sm text-gray-600">{description}</p>
        {trend && (
          <p className="mt-2 text-sm">
            <span className={`font-medium ${trend.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend.value >= 0 ? '+' : ''}{trend.value}%
            </span>
            <span className="text-gray-600"> {trend.label}</span>
          </p>
        )}
      </div>
    </div>
  )
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) return 'just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  return `${Math.floor(diffInSeconds / 86400)}d ago`
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const response = await fetch('/api/analytics')
        if (!response.ok) throw new Error('Failed to fetch analytics')
        const result = await response.json()
        setData(result.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics')
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          {error}
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="mt-2 text-gray-600">Track your video processing and usage statistics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Processing Success Rate"
          value={data.overview.successRate}
          description="Videos successfully processed"
          icon={<PieChart className="h-6 w-6 text-indigo-600" />}
          trend={{ value: data.trends.successRate, label: 'vs last month' }}
        />
        <StatCard
          title="Total Videos"
          value={data.overview.totalVideos}
          description="Videos uploaded and processed"
          icon={<BarChart className="h-6 w-6 text-indigo-600" />}
          trend={{ value: data.trends.totalVideos, label: 'vs last month' }}
        />
        <StatCard
          title="Processing Time"
          value={data.overview.processingTime}
          description="Average processing duration"
          icon={<Activity className="h-6 w-6 text-indigo-600" />}
          trend={{ value: data.trends.processingTime, label: 'vs last month' }}
        />
        <StatCard
          title="Storage Used"
          value={data.overview.storageUsed}
          description="Total storage consumption"
          icon={<HardDrive className="h-6 w-6 text-indigo-600" />}
          trend={{ value: data.trends.storageUsed, label: 'vs last month' }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Timeline */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {data.recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center
                    ${activity.status === 'COMPLETED' ? 'bg-green-100' : 
                      activity.status === 'FAILED' ? 'bg-red-100' : 'bg-yellow-100'}`}
                  >
                    <Activity className={`h-4 w-4
                      ${activity.status === 'COMPLETED' ? 'text-green-600' :
                        activity.status === 'FAILED' ? 'text-red-600' : 'text-yellow-600'}`}
                    />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    Video {activity.status.toLowerCase()}
                  </p>
                  <p className="text-sm text-gray-500">{activity.title}</p>
                </div>
                <div className="flex-shrink-0">
                  <p className="text-sm text-gray-500">{formatDate(activity.updatedAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Processing Stats */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Processing Statistics</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">Success Rate</span>
                <span className="text-sm font-medium text-gray-700">{data.processingStats.successRate}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: `${data.processingStats.successRate}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">Processing Speed</span>
                <span className="text-sm font-medium text-gray-700">{data.processingStats.processingSpeed}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${data.processingStats.processingSpeed}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">Storage Efficiency</span>
                <span className="text-sm font-medium text-gray-700">{data.processingStats.storageEfficiency}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full"
                  style={{ width: `${data.processingStats.storageEfficiency}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 