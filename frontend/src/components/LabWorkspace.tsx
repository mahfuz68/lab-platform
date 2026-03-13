'use client'

import { useMemo, useState, useEffect } from 'react'
import axios from 'axios'
import Terminal from '@/components/TerminalWrapper'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1'

type TabKey = 'terminal' | 'docs' | 'solution'

interface Lab {
  id: number
  title: string
  description: string
  image: string
  duration_minutes: number
  difficulty?: 'easy' | 'medium' | 'hard'
  topic?: string
}

interface LabStep {
  title: string
  instruction: string
  validation: string
}

interface Session {
  session_id: number
  container_id: string
  expires_at: string
}

function inferDifficulty(title: string): 'easy' | 'medium' | 'hard' {
  const lower = title.toLowerCase()
  if (lower.includes('kubernetes') || lower.includes('helm') || lower.includes('terraform')) return 'hard'
  if (lower.includes('docker') || lower.includes('ci') || lower.includes('ansible')) return 'medium'
  return 'easy'
}

function inferTopic(title: string): string {
  const lower = title.toLowerCase()
  if (lower.includes('docker')) return 'Docker'
  if (lower.includes('kubernetes') || lower.includes('helm')) return 'Kubernetes'
  if (lower.includes('git')) return 'Git'
  if (lower.includes('ansible')) return 'Ansible'
  if (lower.includes('nginx')) return 'Linux'
  return 'DevOps'
}

export default function LabWorkspace() {
  const [labs, setLabs] = useState<Lab[]>([])
  const [selectedLab, setSelectedLab] = useState<Lab | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [steps, setSteps] = useState<LabStep[]>([])
  const [loading, setLoading] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const [activeTab, setActiveTab] = useState<TabKey>('terminal')
  const [hintUsed, setHintUsed] = useState(false)
  const [hintText, setHintText] = useState('')

  const [search, setSearch] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'easy' | 'medium' | 'hard'>('all')
  const [topicFilter, setTopicFilter] = useState('all')
  const [durationFilter, setDurationFilter] = useState<'all' | '30' | '45' | '60'>('all')

  useEffect(() => {
    fetchLabs()
  }, [])

  useEffect(() => {
    if (session?.expires_at) {
      const expires = new Date(session.expires_at).getTime()
      const interval = setInterval(() => {
        const remaining = Math.max(0, Math.floor((expires - Date.now()) / 1000))
        setTimeLeft(remaining)
        if (remaining === 0) {
          handleEndSession()
        }
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [session])

  const normalizedLabs = useMemo(() => {
    return labs.map((lab) => ({
      ...lab,
      difficulty: lab.difficulty || inferDifficulty(lab.title),
      topic: lab.topic || inferTopic(lab.title),
    }))
  }, [labs])

  const filteredLabs = useMemo(() => {
    return normalizedLabs.filter((lab) => {
      const matchesSearch =
        !search ||
        lab.title.toLowerCase().includes(search.toLowerCase()) ||
        lab.description.toLowerCase().includes(search.toLowerCase())

      const matchesDifficulty = difficultyFilter === 'all' || lab.difficulty === difficultyFilter
      const matchesTopic = topicFilter === 'all' || lab.topic === topicFilter
      const matchesDuration =
        durationFilter === 'all' ||
        (durationFilter === '30' && lab.duration_minutes <= 30) ||
        (durationFilter === '45' && lab.duration_minutes <= 45) ||
        (durationFilter === '60' && lab.duration_minutes <= 60)

      return matchesSearch && matchesDifficulty && matchesTopic && matchesDuration
    })
  }, [normalizedLabs, search, difficultyFilter, topicFilter, durationFilter])

  const topics = useMemo(() => {
    const unique = Array.from(new Set(normalizedLabs.map((lab) => lab.topic || 'DevOps')))
    return ['all', ...unique]
  }, [normalizedLabs])

  const completedCount = Math.min(currentStep, steps.length)
  const totalCount = steps.length
  const activeTaskIndex = Math.min(currentStep, Math.max(steps.length - 1, 0))
  const currentObjective = steps[activeTaskIndex]?.instruction || 'Start a lab to get your objective'
  const solutionUnlocked = hintUsed
  const xpEarned = completedCount * 40

  const fetchLabs = async () => {
    try {
      const res = await axios.get(`${API_URL}/labs`)
      setLabs(res.data)
    } catch (err) {
      console.error('Failed to fetch labs:', err)
    }
  }

  const handleStartLab = async (lab: Lab) => {
    setLoading(true)
    setSelectedLab(lab)
    setActiveTab('terminal')
    setHintUsed(false)
    setHintText('')

    try {
      const res = await axios.post(`${API_URL}/sessions/start`, {
        lab_id: lab.id,
        user_id: 1,
      })

      setSession(res.data)

      const labRes = await axios.get(`${API_URL}/labs/${lab.id}`)
      const parsedSteps = labRes.data.steps ? JSON.parse(labRes.data.steps) : []
      setSteps(parsedSteps)
      setCurrentStep(0)
    } catch (err) {
      console.error('Failed to start lab:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleEndSession = async () => {
    if (!session) return

    try {
      await axios.post(`${API_URL}/sessions/${session.session_id}/end`)
    } catch (err) {
      console.error('Failed to end session:', err)
    }

    setSession(null)
    setSelectedLab(null)
    setSteps([])
    setCurrentStep(0)
    setTimeLeft(0)
    setHintUsed(false)
    setHintText('')
    setActiveTab('terminal')
  }

  const handleValidateStep = async () => {
    if (!session || !steps.length) return

    try {
      const res = await axios.get(`${API_URL}/sessions/${session.session_id}/validate?step=${activeTaskIndex}`)
      if (res.data.passed) {
        setCurrentStep((prev) => Math.min(prev + 1, steps.length))
      }
      window.alert(res.data.passed ? 'Task validated successfully.' : 'Validation failed. Try again.')
    } catch (err) {
      console.error('Failed to validate:', err)
    }
  }

  const handleHint = () => {
    if (!steps.length) return
    const step = steps[activeTaskIndex]
    const instruction = step?.instruction || ''
    const firstLine = instruction.split('\n').find((line) => line.trim().length > 0) || 'Check the current task carefully.'
    setHintText(firstLine)
    setHintUsed(true)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const difficultyClass = (difficulty?: string) => {
    if (difficulty === 'easy') return 'bg-green-100 text-green-700'
    if (difficulty === 'hard') return 'bg-red-100 text-red-700'
    return 'bg-amber-100 text-amber-700'
  }

  return (
    <div className="h-[78vh] min-h-[640px] rounded-lg border border-gray-200 bg-white overflow-hidden flex">
      <aside className="w-64 border-r border-gray-200 bg-gray-50 flex flex-col">
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-gray-900">Lab Library</h2>
            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">PRO</span>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search labs..."
            className="w-full text-xs px-2 py-1.5 rounded border border-gray-300 bg-white"
          />
          <div className="grid grid-cols-2 gap-2 mt-2">
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value as 'all' | 'easy' | 'medium' | 'hard')}
              className="text-xs px-2 py-1 rounded border border-gray-300 bg-white"
            >
              <option value="all">All levels</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
            <select
              value={durationFilter}
              onChange={(e) => setDurationFilter(e.target.value as 'all' | '30' | '45' | '60')}
              className="text-xs px-2 py-1 rounded border border-gray-300 bg-white"
            >
              <option value="all">Any duration</option>
              <option value="30">≤ 30 min</option>
              <option value="45">≤ 45 min</option>
              <option value="60">≤ 60 min</option>
            </select>
          </div>
          <select
            value={topicFilter}
            onChange={(e) => setTopicFilter(e.target.value)}
            className="w-full text-xs px-2 py-1 rounded border border-gray-300 bg-white mt-2"
          >
            {topics.map((topic) => (
              <option key={topic} value={topic}>
                {topic === 'all' ? 'All topics' : topic}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {filteredLabs.length === 0 ? (
            <p className="text-xs text-gray-500 px-4 py-2">No labs match current filters.</p>
          ) : (
            filteredLabs.map((lab) => {
              const isActive = selectedLab?.id === lab.id
              return (
                <button
                  type="button"
                  key={lab.id}
                  onClick={() => !session && handleStartLab(lab)}
                  className={`w-full text-left px-4 py-2 border-l-2 transition-colors ${
                    isActive ? 'bg-white border-l-indigo-600' : 'border-l-transparent hover:bg-white'
                  }`}
                >
                  <div className="text-xs font-medium text-gray-900">{lab.title}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${difficultyClass(lab.difficulty)}`}>
                      {lab.difficulty}
                    </span>
                    <span className="text-[10px] text-gray-500">{lab.duration_minutes} min</span>
                    <span className="text-[10px] text-gray-500">{lab.topic}</span>
                  </div>
                </button>
              )
            })
          )}
        </div>

        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-500">Session XP</div>
            <div className="text-sm font-semibold text-gray-900">+{xpEarned}</div>
          </div>
          <div className="text-[10px] px-2 py-1 rounded-full bg-green-100 text-green-700">Active</div>
        </div>
      </aside>

      <div className="w-80 border-r border-gray-200 flex flex-col">
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="text-xs font-semibold text-gray-700">Tasks</div>
          <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 transition-all"
              style={{ width: `${totalCount ? (completedCount / totalCount) * 100 : 0}%` }}
            />
          </div>
          <div className="text-[11px] text-gray-500 mt-1">
            {completedCount} of {totalCount} complete
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {!steps.length ? (
            <div className="text-xs text-gray-500">Start a lab to load tasks.</div>
          ) : (
            steps.map((step, index) => {
              const isDone = index < completedCount
              const isCurrent = index === activeTaskIndex && session && completedCount < totalCount

              return (
                <div
                  key={`${step.title}-${index}`}
                  className={`rounded-lg border p-3 mb-2 ${
                    isCurrent
                      ? 'border-indigo-500 bg-indigo-50'
                      : isDone
                      ? 'border-gray-200 bg-gray-50 opacity-70'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="text-[10px] text-gray-500 mb-1">Task {index + 1}</div>
                  <div className="text-xs text-gray-900 leading-relaxed">{step.instruction}</div>
                </div>
              )
            })
          )}

          {session && totalCount > 0 && completedCount < totalCount && (
            <button
              onClick={handleValidateStep}
              className="w-full mt-2 py-2 px-3 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
            >
              Validate Current Task
            </button>
          )}

          {session && totalCount > 0 && completedCount >= totalCount && (
            <div className="mt-2 text-sm text-green-700 bg-green-100 rounded p-2 text-center">All tasks completed.</div>
          )}
        </div>
      </div>

      <section className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 py-2 border-b border-gray-200 flex items-center gap-3">
          <div className="text-sm font-medium text-gray-900 flex-1">
            {selectedLab ? selectedLab.title : 'No lab selected'}
          </div>

          <div className="flex items-center gap-2 border border-gray-200 rounded px-2 py-1 bg-gray-50">
            <span className={`w-2 h-2 rounded-full ${session ? 'bg-green-500' : 'bg-gray-400'}`} />
            <span className="text-sm font-medium text-gray-900 tabular-nums">{formatTime(timeLeft)}</span>
            <span className="text-[10px] text-gray-500">remaining</span>
          </div>

          <button
            onClick={handleHint}
            disabled={!session || !steps.length}
            className="text-xs px-3 py-1.5 rounded border border-gray-300 text-gray-700 disabled:opacity-50"
          >
            Hint
          </button>

          {session && (
            <button
              onClick={handleEndSession}
              className="text-xs px-3 py-1.5 rounded border border-red-300 text-red-600"
            >
              End Lab
            </button>
          )}
        </div>

        <div className="px-4 py-2 text-xs text-indigo-700 bg-indigo-50 border-b border-indigo-100">
          Current objective: {currentObjective}
        </div>

        <div className="px-4 border-b border-gray-200 flex items-center gap-4">
          <button
            onClick={() => setActiveTab('terminal')}
            className={`text-xs py-2 border-b-2 ${activeTab === 'terminal' ? 'border-indigo-600 text-gray-900' : 'border-transparent text-gray-500'}`}
          >
            Terminal
          </button>
          <button
            onClick={() => setActiveTab('docs')}
            className={`text-xs py-2 border-b-2 ${activeTab === 'docs' ? 'border-indigo-600 text-gray-900' : 'border-transparent text-gray-500'}`}
          >
            Docs
          </button>
          <button
            onClick={() => solutionUnlocked && setActiveTab('solution')}
            className={`text-xs py-2 border-b-2 ${activeTab === 'solution' ? 'border-indigo-600 text-gray-900' : 'border-transparent text-gray-500'} ${!solutionUnlocked ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Solution
          </button>
        </div>

        <div className="flex-1 bg-gray-900">
          {loading ? (
            <div className="h-full flex items-center justify-center text-white">Starting lab session...</div>
          ) : activeTab === 'terminal' ? (
            session ? (
              <Terminal sessionId={session.session_id} />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">Start a lab to access terminal.</div>
            )
          ) : activeTab === 'docs' ? (
            <div className="h-full bg-white p-4 overflow-auto">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Task documentation</h3>
              {steps.length ? (
                <div className="space-y-2 text-sm text-gray-700">
                  <p>
                    <strong>Current task:</strong> {steps[activeTaskIndex]?.title}
                  </p>
                  <p>{steps[activeTaskIndex]?.instruction}</p>
                  <p className="text-xs text-gray-500">Validation command: {steps[activeTaskIndex]?.validation}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Start a lab to view docs for the active task.</p>
              )}
            </div>
          ) : (
            <div className="h-full bg-white p-4 overflow-auto">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Solution guidance</h3>
              {!solutionUnlocked ? (
                <p className="text-sm text-gray-500">Use Hint once to unlock solution guidance.</p>
              ) : (
                <div className="space-y-2 text-sm text-gray-700">
                  <p>{hintText || 'Use the task validation command to verify expected state after each command.'}</p>
                  <p className="text-xs text-gray-500">This guidance is intentionally partial to preserve learning flow.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
