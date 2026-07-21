import { useState, useCallback } from "react";
import { Star } from "lucide-react";

export interface RatingOption { value: number; label: string; emoji: string; reaction: string; glow: string; accent: string; }
export const RATING_OPTIONS: RatingOption[] = [
  { value: 1, label: "Terrible", emoji: "\uD83D\uDE21", reaction: "We hear you", glow: "rgba(239,68,68,0.6)", accent: "#ef4444" },
  { value: 2, label: "Bad", emoji: "\uD83D\uDE15", reaction: "Noted, thanks", glow: "rgba(249,115,22,0.6)", accent: "#f97316" },
  { value: 3, label: "Okay", emoji: "\uD83D\uDE10", reaction: "Good to know", glow: "rgba(234,179,8,0.6)", accent: "#eab308" },
  { value: 4, label: "Good", emoji: "\uD83D\uDE0A", reaction: "Love that!", glow: "rgba(59,130,246,0.6)", accent: "#3b82f6" },
  { value: 5, label: "Amazing", emoji: "\uD83E\uDD29", reaction: "Amazing!", glow: "rgba(168,85,247,0.6)", accent: "#a855f7" },
];
interface Props { value: number; onChange: (r: number) => void; onSelect?: (r: number) => void; disabled?: boolean; }
export default function EmojiRating3D({ value, onChange, onSelect, disabled }: Props) {
  const [hover, setHover] = useState(0);
  const handleSelect = useCallback((r: number) => { if (disabled) return; onChange(r); onSelect?.(r); }, [disabled, onChange, onSelect]);
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-2 sm:gap-3 justify-center items-end" onMouseLeave={() => setHover(0)}>
        {RATING_OPTIONS.map((opt) => {
          const sel = value === opt.value; const hov = hover === opt.value; const active = sel || hov;
          return (
            <button key={opt.value} type="button" disabled={disabled} onMouseEnter={() => !disabled && setHover(opt.value)} onClick={() => handleSelect(opt.value)}
              className={`relative flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl border w-[18%] max-w-[90px] transition-all duration-300 ${sel ? "glass-card" : "glass"} ${disabled ? "cursor-default opacity-50" : "cursor-pointer hover:-translate-y-2 hover:scale-105"}`}
              style={active ? { borderColor: opt.accent, boxShadow: `0 0 30px ${opt.glow}, 0 10px 30px rgba(0,0,0,0.4)` } : undefined} aria-label={opt.label}>
              <Star className={`w-7 h-7 sm:w-8 sm:h-8 mb-1 transition-all ${active ? "fill-current" : ""}`} style={{ color: active ? opt.accent : "#475569" }} />
              <span className={`text-[10px] sm:text-xs font-semibold ${active ? "text-white" : "text-slate-500"}`}>{opt.label}</span>
            </button>
          );
        })}
      </div>
      {(hover || value) > 0 && (
        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl glass animate-scale-in" style={{ boxShadow: `0 0 25px ${RATING_OPTIONS[(hover || value) - 1]?.glow}` }}>
          <span className="text-4xl">{RATING_OPTIONS[(hover || value) - 1]?.emoji}</span>
          <span className="text-lg font-bold" style={{ color: RATING_OPTIONS[(hover || value) - 1]?.accent }}>{RATING_OPTIONS[(hover || value) - 1]?.reaction}</span>
        </div>
      )}
    </div>
  );
}
