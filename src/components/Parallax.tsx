import { useEffect, useRef, useState } from 'react'
import { prefersReducedMotion } from '../lib/utils'

export function useParallax<T extends HTMLElement>(strength = 20) {
  const ref = useRef<T>(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (prefersReducedMotion()) return

    let raf = 0
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const x = (e.clientX / window.innerWidth - 0.5) * strength
        const y = (e.clientY / window.innerHeight - 0.5) * strength
        setOffset({ x, y })
      })
    }
    window.addEventListener('mousemove', onMove)
    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [strength])

  return { ref, offset }
}

export function ParallaxLayer({ children, strength = 20, className = '' }: {
  children: React.ReactNode
  strength?: number
  className?: string
}) {
  const { offset } = useParallax<HTMLDivElement>(strength)
  if (prefersReducedMotion()) return <div className={className}>{children}</div>

  return (
    <div
      className={className}
      style={{
        transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
        transition: 'transform 0.1s ease-out',
      }}
    >
      {children}
    </div>
  )
}
