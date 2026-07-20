import { useState } from "react";

interface StarRating3DProps {
  value: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
}

export default function StarRating3D({ value, onChange, disabled }: StarRating3DProps) {
  const [hover, setHover] = useState(0);
  const display = hover || value;

  return (
    <div className="star3d-container flex gap-3 justify-center" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((star) => {
        const isActive = star <= display;
        return (
          <button
            key={star}
            type="button"
            disabled={disabled}
            onMouseEnter={() => !disabled && setHover(star)}
            onClick={() => !disabled && onChange(star)}
            className={`star3d text-5xl sm:text-6xl ${isActive ? "star3d-active text-yellow-400" : "text-slate-600"} ${disabled ? "cursor-default" : "cursor-pointer"}`}
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
          >
            {isActive ? "\u2605" : "\u2606"}
          </button>
        );
      })}
    </div>
  );
}
