import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'

export function FadeIn({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  const r = useReducedMotion()
  if (r) return <div className={className}>{children}</div>
  return <motion.div className={className} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay, ease: 'easeOut' }}>{children}</motion.div>
}

export function StaggerContainer({ children, className = '' }: { children: ReactNode; className?: string }) {
  const r = useReducedMotion()
  if (r) return <div className={className}>{children}</div>
  return <motion.div className={className} initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}>{children}</motion.div>
}

export function StaggerItem({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  const r = useReducedMotion()
  if (r) return <div className={className} onClick={onClick}>{children}</div>
  return <motion.div className={className} onClick={onClick} variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } } }}>{children}</motion.div>
}
