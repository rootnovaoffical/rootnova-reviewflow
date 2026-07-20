// Reusable UI primitives for the admin dashboard.

import { type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes } from "react";
import { cn } from "../lib/cn";
import { Loader2 } from "lucide-react";

// Button
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: ReactNode;
}

export function Button({ variant = "primary", size = "md", loading, className, children, disabled, ...rest }: ButtonProps) {
  const variants: Record<ButtonVariant, string> = {
    primary: "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/40",
    secondary: "bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700",
    outline: "border border-slate-700 hover:bg-slate-800 text-slate-200",
    ghost: "hover:bg-slate-800 text-slate-300",
    danger: "bg-rose-600 hover:bg-rose-500 text-white",
  };
  const sizes: Record<ButtonSize, string> = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2.5 text-sm",
    lg: "px-5 py-3 text-base",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500/50",
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}

// Card
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm", className)}>
      {children}
    </div>
  );
}

// Input
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
}
export function Input({ label, hint, className, id, ...rest }: InputProps) {
  const inputId = id || rest.name;
  return (
    <div className="space-y-1.5">
      {label && <label htmlFor={inputId} className="block text-sm font-medium text-slate-300">{label}</label>}
      <input
        id={inputId}
        className={cn(
          "w-full rounded-xl bg-slate-950/60 border border-slate-700 px-3.5 py-2.5 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition",
          className,
        )}
        {...rest}
      />
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
}
export function Textarea({ label, hint, className, id, ...rest }: TextareaProps) {
  const inputId = id || rest.name;
  return (
    <div className="space-y-1.5">
      {label && <label htmlFor={inputId} className="block text-sm font-medium text-slate-300">{label}</label>}
      <textarea
        id={inputId}
        className={cn(
          "w-full rounded-xl bg-slate-950/60 border border-slate-700 px-3.5 py-2.5 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition resize-y min-h-[90px]",
          className,
        )}
        {...rest}
      />
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}
export function Select({ label, className, id, children, ...rest }: SelectProps) {
  const inputId = id || rest.name;
  return (
    <div className="space-y-1.5">
      {label && <label htmlFor={inputId} className="block text-sm font-medium text-slate-300">{label}</label>}
      <select
        id={inputId}
        className={cn(
          "w-full rounded-xl bg-slate-950/60 border border-slate-700 px-3.5 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition",
          className,
        )}
        {...rest}
      >
        {children}
      </select>
    </div>
  );
}

// Badge
type BadgeColor = "green" | "red" | "amber" | "blue" | "slate" | "purple";
export function Badge({ color = "slate", children }: { color?: BadgeColor; children: ReactNode }) {
  const colors: Record<BadgeColor, string> = {
    green: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    red: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    amber: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    blue: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    slate: "bg-slate-700/40 text-slate-300 border-slate-600/40",
    purple: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border", colors[color])}>
      {children}
    </span>
  );
}

// Empty state
export function EmptyState({ icon, title, description, message, action }: { icon?: ReactNode; title: string; description?: string; message?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      {icon && <div className="mb-4 text-slate-600">{icon}</div>}
      <h3 className="text-lg font-semibold text-slate-200">{title}</h3>
      {(description || message) && <p className="mt-1.5 text-sm text-slate-500 max-w-md">{description || message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// Spinner / loading
export function Loading({ label = "Loading...", message }: { label?: string; message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
      <p className="text-sm text-slate-400">{message || label}</p>
    </div>
  );
}

// Stat card
export function StatCard({ label, value, icon, accent = "indigo" }: { label: string; value: ReactNode; icon?: ReactNode; accent?: "indigo" | "emerald" | "amber" | "rose" | "sky" }) {
  const accents: Record<string, string> = {
    indigo: "from-indigo-500/20 to-indigo-500/5 text-indigo-300",
    emerald: "from-emerald-500/20 to-emerald-500/5 text-emerald-300",
    amber: "from-amber-500/20 to-amber-500/5 text-amber-300",
    rose: "from-rose-500/20 to-rose-500/5 text-rose-300",
    sky: "from-sky-500/20 to-sky-500/5 text-sky-300",
  };
  return (
    <Card className="p-5 relative overflow-hidden">
      <div className={cn("absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl opacity-60 bg-gradient-to-br", accents[accent])} />
      <div className="relative">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-400">{label}</p>
          {icon && <div className={cn("p-2 rounded-lg bg-gradient-to-br", accents[accent])}>{icon}</div>}
        </div>
        <p className="mt-3 text-3xl font-bold text-white tracking-tight">{value}</p>
      </div>
    </Card>
  );
}

// Modal
export function Modal({ open, onClose, title, children, size = "md" }: { open: boolean; onClose: () => void; title: string; children: ReactNode; size?: "sm" | "md" | "lg" }) {
  if (!open) return null;
  const sizes = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={cn("relative w-full rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl", sizes[size])}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h3 className="font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">&times;</button>
        </div>
        <div className="p-5 max-h-[75vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
