'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { ChevronRight, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const THUMB_WIDTH = 56

interface SlideToConfirmProps {
  onConfirmed: () => void
  label?: string
  resetKey?: number | string
}

export function SlideToConfirm({ onConfirmed, label = 'Slide to confirm', resetKey }: SlideToConfirmProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isConfirmed, setIsConfirmed] = useState(false)

  const startXRef = useRef(0)
  const startPosRef = useRef(0)

  useEffect(() => {
    setPosition(0)
    setIsConfirmed(false)
    setIsDragging(false)
  }, [resetKey])

  const getMaxSlide = useCallback(() => {
    if (!trackRef.current) return 0
    return trackRef.current.offsetWidth - THUMB_WIDTH
  }, [])

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isConfirmed) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setIsDragging(true)
    startXRef.current = e.clientX
    startPosRef.current = position
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || isConfirmed) return
    e.preventDefault()
    const delta = e.clientX - startXRef.current
    const maxSlide = getMaxSlide()
    const newPos = Math.max(0, Math.min(startPosRef.current + delta, maxSlide))
    setPosition(newPos)
  }

  const handlePointerUp = () => {
    if (!isDragging) return
    setIsDragging(false)
    const maxSlide = getMaxSlide()
    if (maxSlide > 0 && position / maxSlide >= 0.9) {
      setPosition(maxSlide)
      setIsConfirmed(true)
      onConfirmed()
    } else {
      setPosition(0)
    }
  }

  return (
    <div
      ref={trackRef}
      className="relative h-14 rounded-full bg-muted border border-border overflow-hidden select-none"
    >
      {/* Fill */}
      <div
        className="absolute left-0 top-0 bottom-0 bg-primary/20 pointer-events-none"
        style={{ width: position + THUMB_WIDTH }}
      />

      {/* Label */}
      <span className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground pointer-events-none">
        {isConfirmed ? 'Confirmed' : label}
      </span>

      {/* Thumb */}
      <div
        className={cn(
          'absolute top-0 left-0 h-14 w-14 flex items-center justify-center rounded-full touch-none',
          isConfirmed ? 'bg-green-500' : 'bg-primary',
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        )}
        style={{
          transform: `translateX(${position}px)`,
          transition: isDragging ? 'none' : 'transform 300ms ease'
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {isConfirmed ? (
          <CheckCircle2 className="h-6 w-6 text-white" />
        ) : (
          <ChevronRight className="h-6 w-6 text-primary-foreground" />
        )}
      </div>
    </div>
  )
}
