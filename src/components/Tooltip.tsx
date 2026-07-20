import { useState, useRef, useEffect, type ReactNode } from "react";

/**
 * Tooltip — lightweight contextual guidance.
 * Purpose: helps non-technical business owners understand fields without cluttering the UI.
 */
export function Tooltip({ content, children, side = "top" }: { content: string; children: ReactNode; side?: "top" | "bottom" | "left" | "right" }) {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShow(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const posClasses: Record<string, string> = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <div ref={ref} className="relative inline-flex" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className={`absolute z-50 ${posClasses[side]} px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-xs text-slate-200 shadow-xl whitespace-nowrap max-w-xs animate-fade-in pointer-events-none`}>
          {content}
        </div>
      )}
    </div>
  );
}

/** InfoDot — a small info icon that shows a tooltip on hover */
export function InfoDot({ content, side = "top" }: { content: string; side?: "top" | "bottom" | "left" | "right" }) {
  return (
    <Tooltip content={content} side={side}>
      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/10 text-slate-400 text-xs cursor-help hover:bg-white/20 hover:text-white transition-colors">
        ?
      </span>
    </Tooltip>
  );
}
