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
    <div className="flex gap-3 justify-center" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onMouseEnter={() => !disabled && setHover(star)}
          onClick={() => !disabled && onChange(star)}
          className={`star3d text-5xl ${star <= display ? "star3d-active text-yellow-400" : "text-slate-600"} ${disabled ? "cursor-default" : "cursor-pointer"}`}
          style={{ transform: star <= display ? "perspective(400px) rotateX(15deg)" : "none" }}
        >
          {star <= display ? "\u2605" : "\u2606"}
        </button>
      ))}
    </div>
  );
}
