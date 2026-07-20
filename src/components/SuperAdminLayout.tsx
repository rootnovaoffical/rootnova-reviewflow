import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { roleLabel } from '../lib/auth-api'
import { SpatialBackground, GlowOrb } from './SpatialBackground'
import { LayoutDashboard, Building2, CreditCard, Package, Palette, ToggleLeft, ScrollText, LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export function SuperAdminLayout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleSignOut = async () => { await signOut(); navigate('/login') }

  const navItems = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/organizations', label: 'Organizations', icon: Building2 },
    { to: '/admin/businesses', label: 'Businesses', icon: Building2 },
    { to: '/admin/payments', label: 'Payments', icon: CreditCard },
    { to: '/admin/plans', label: 'Plans', icon: Package },
    { to: '/admin/branding', label: 'Branding', icon: Palette },
    { to: '/admin/feature-flags', label: 'Feature Flags', icon: ToggleLeft },
    { to: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText },
  ]

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      <SpatialBackground color1="#6366f1" color2="#8b5cf6" />
      <GlowOrb color="#6366f1" size={500} className="-top-40 -left-40" />
      <GlowOrb color="#8b5cf6" size={400} className="bottom-0 right-0" />

      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 glass px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center"><span className="text-white font-bold text-sm">R</span></div>
          <span className="font-semibold text-ink-100">RootNova</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="text-ink-200 p-2">{mobileOpen ? <X size={20} /> : <Menu size={20} />}</button>
      </div>

      <AnimatePresence>{mobileOpen && <motion.div className="lg:hidden fixed inset-0 bg-black/50 z-40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} />}</AnimatePresence>

      <aside className={`w-64 glass border-r border-ink-600/50 flex flex-col fixed lg:static z-50 h-full transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-5 border-b border-ink-600/40 hidden lg:block">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-lg shadow-brand-500/30"><span className="text-white font-bold">R</span></div>
            <div><div className="font-bold text-ink-100 text-sm">RootNova</div><div className="text-xs text-ink-400">Control Center</div></div>
          </div>
        </div>
        <div className="p-4 mt-14 lg:mt-0">
          <div className="text-xs text-ink-400 px-3 mb-2 uppercase tracking-wider">Platform</div>
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} onClick={() => setMobileOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}>
                <item.icon size={18} /> {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="mt-auto p-4 border-t border-ink-600/40">
          <div className="px-3 py-2">
            <div className="text-sm font-medium text-ink-100 truncate">{profile?.full_name || 'User'}</div>
            <div className="text-xs text-ink-400 truncate">{profile?.email}</div>
            <div className="mt-1.5"><span className="badge bg-brand-500/15 text-brand-300 border border-brand-500/20">{roleLabel(profile?.role ?? 'ROOTNOVA_ADMIN')}</span></div>
          </div>
          <button onClick={handleSignOut} className="nav-item w-full text-error-400 mt-2"><LogOut size={18} /> Sign Out</button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto scrollbar-thin pt-14 lg:pt-0 relative z-10"><Outlet /></main>
    </div>
  )
}
