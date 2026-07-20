import { useState } from "react";

interface StarRating3DProps {
  value: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
}

const RATING_MOODS: Record<number, { emoji: string; label: string; color: string }> = {
  1: { emoji: "\uD83D\uDE14", label: "We hear you", color: "rgba(148, 163, 184, 0.4)" },
  2: { emoji: "\uD83D\uDE10", label: "Noted, thanks", color: "rgba(34, 211, 238, 0.3)" },
  3: { emoji: "\uD83D\uDE0C", label: "Good to know", color: "rgba(34, 197, 94, 0.3)" },
  4: { emoji: "\uD83D\uDE0A", label: "Love that!", color: "rgba(250, 204, 21, 0.5)" },
  5: { emoji: "\uD83E\uDD29", label: "Amazing!", color: "rgba(250, 204, 21, 0.7)" },
};

export default function StarRating3D({ value, onChange, disabled }: StarRating3DProps) {
  const [hover, setHover] = useState(0);
  const display = hover || value;

  const mood = RATING_MOODS[display] || null;

  return (
    <div className="flex flex-col items-center gap-6">
      <div
        className="star3d-container flex gap-3 sm:gap-4 justify-center"
        onMouseLeave={() => setHover(0)}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const isActive = star <= display;
          return (
            <button
              key={star}
              type="button"
              disabled={disabled}
              onMouseEnter={() => !disabled && setHover(star)}
              onClick={() => !disabled && onChange(star)}
              className={`star3d-hit ${disabled ? "cursor-default" : "cursor-pointer"}`}
              aria-label={`${star} star${star > 1 ? "s" : ""}`}
            >
              <span className={`star3d text-5xl sm:text-6xl ${isActive ? "star3d-active text-yellow-400" : "text-slate-600"}`}>
                {isActive ? "\u2605" : "\u2606"}
              </span>
            </button>
          );
        })}
      </div>

      {mood && display > 0 && (
        <div
          key={display}
          className="flex flex-col items-center gap-2 animate-fade-in"
        >
          <div
            className="text-4xl sm:text-5xl transition-all duration-500"
            style={{ filter: `drop-shadow(0 4px 12px ${mood.color})` }}
          >
            {mood.emoji}
          </div>
          <p className="text-sm font-medium text-slate-300">{mood.label}</p>
        </div>
      )}
    </div>
  );
}
