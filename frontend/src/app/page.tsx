'use client'

import LabList from '@/components/LabList'
import LabWorkspace from '@/components/LabWorkspace'

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">KodeKloud Lab</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">DevOps Learning Platform</span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <LabWorkspace />
      </div>
    </main>
  )
}
