'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1'

interface Lab {
  id: number
  title: string
  description: string
  image: string
  duration_minutes: number
  steps?: any[]
  created_at?: string
  updated_at?: string
}

export default function LabList() {
  const [labs, setLabs] = useState<Lab[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchLabs = async () => {
      try {
        const response = await axios.get(`${API_URL}/labs`)
        setLabs(response.data)
        setError(null)
      } catch (err) {
        console.error('Failed to fetch labs:', err)
        setError('Failed to load labs. Using default labs.')
        setLabs([
          {
            id: 1,
            title: 'Git Basics',
            description: 'Learn Git version control fundamentals',
            image: 'devops-lab:git',
            duration_minutes: 30
          },
          {
            id: 2,
            title: 'Docker Fundamentals',
            description: 'Containerization with Docker',
            image: 'devops-lab:docker',
            duration_minutes: 45
          },
          {
            id: 3,
            title: 'Kubernetes Basics',
            description: 'Container orchestration with K8s',
            image: 'devops-lab:kubernetes',
            duration_minutes: 60
          },
          {
            id: 4,
            title: 'Ansible Automation',
            description: 'Configuration management with Ansible',
            image: 'devops-lab:ansible',
            duration_minutes: 45
          },
          {
            id: 5,
            title: 'MySQL Administration',
            description: 'Database management and optimization',
            image: 'devops-lab:mysql',
            duration_minutes: 40
          }
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchLabs()
  }, [])

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="p-4 border border-gray-200 rounded-lg animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-3/4"></div>
          <div className="flex items-center gap-4 mt-3">
            <div className="h-3 bg-gray-200 rounded w-16"></div>
            <div className="h-3 bg-gray-200 rounded w-24"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-3 bg-yellow-100 text-yellow-700 rounded-lg text-sm">
          Warning: {error}
        </div>
      )}
      {labs.map(lab => (
        <div
          key={lab.id}
          className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors cursor-pointer"
        >
          <h3 className="font-semibold text-gray-900">{lab.title}</h3>
          <p className="text-sm text-gray-500 mt-1">{lab.description}</p>
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {lab.duration_minutes} min
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
              </svg>
              {lab.image}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
