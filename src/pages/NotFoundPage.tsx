import { Link } from 'react-router-dom'
import { SpatialBackground, GlowOrb } from '../components/SpatialBackground'
import { FadeIn } from '../components/Animations'

export function NotFoundPage() {
  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-4 bg-ink-950">
      <SpatialBackground />
      <GlowOrb color="#6366f1" size={400} className="-top-20 -right-20" />
      <FadeIn className="text-center relative z-10">
        <h1 className="text-6xl font-bold text-gradient mb-2">404</h1>
        <p className="text-ink-400 mb-6">Page not found</p>
        <Link to="/login" className="btn-primary inline-flex">Go Home</Link>
      </FadeIn>
    </div>
  )
}
