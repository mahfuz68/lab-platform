'use client'

import { useEffect, useRef, useState } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/api/v1'

interface TerminalProps {
  sessionId: number
}

export default function Terminal({ sessionId }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<XTerm | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return

    const xterm = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1a1a1a',
        foreground: '#ffffff',
        cursor: '#ffffff',
        selectionBackground: 'rgba(255, 255, 255, 0.3)',
      },
      rows: 24,
      cols: 80,
    })

    const fitAddon = new FitAddon()
    xterm.loadAddon(fitAddon)
    xterm.loadAddon(new WebLinksAddon())

    xterm.open(terminalRef.current)
    fitAddon.fit()

    xtermRef.current = xterm

    const ws = new WebSocket(`${WS_URL}/terminal/${sessionId}`)
    ws.binaryType = 'arraybuffer'
    
    ws.onopen = () => {
      setConnected(true)
      xterm.writeln('\x1b[32mConnected to lab environment\x1b[0m\r\n')
    }

    ws.onmessage = (event) => {
      const data = typeof event.data === 'string' ? event.data : new TextDecoder().decode(event.data)
      xterm.write(data)
    }

    ws.onclose = () => {
      setConnected(false)
      xterm.writeln('\r\n\x1b[33mConnection closed\x1b[0m')
    }

    ws.onerror = () => {
      xterm.writeln('\r\n\x1b[31mConnection error\x1b[0m')
    }

    xterm.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        const message = JSON.stringify({
          type: 'command',
          payload: { session_id: sessionId, command: data }
        })
        ws.send(message)
      }
    })

    wsRef.current = ws

    const handleResize = () => {
      fitAddon.fit()
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      ws.close()
      xterm.dispose()
      xtermRef.current = null
    }
  }, [sessionId])

  return (
    <div className="relative h-full">
      <div ref={terminalRef} className="h-full w-full" />
      {!connected && xtermRef.current && (
        <div className="absolute top-2 right-2 px-2 py-1 bg-red-500 text-white text-xs rounded">
          Disconnected
        </div>
      )}
    </div>
  )
}
