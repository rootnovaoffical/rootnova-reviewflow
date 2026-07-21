import { useState } from 'react';

const RATING_OPTIONS = [
  { value: 5, label: 'Amazing', emoji: '🤩', color: 'from-amber-400 to-yellow-500' },
  { value: 4, label: 'Good', emoji: '😀', color: 'from-lime-400 to-green-500' },
  { value: 3, label: 'Okay', emoji: '😐', color: 'from-blue-400 to-cyan-500' },
  { value: 2, label: 'Poor', emoji: '😕', color: 'from-orange-400 to-red-500' },
  { value: 1, label: 'Terrible', emoji: '😡', color: 'from-red-500 to-rose-600' },
];

interface Props { value: number | null; onChange: (rating: number) => void; }

export default function StarRating3D({ value, onChange }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  return (
    <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
      {RATING_OPTIONS.map((opt) => {
        const isSelected = (hover ?? value) === opt.value;
        return (
          <button key={opt.value} type="button" onClick={() => onChange(opt.value)} onMouseEnter={() => setHover(opt.value)} onMouseLeave={() => setHover(null)}
            className={`group relative flex flex-col items-center gap-2 transition-all duration-300 ${isSelected ? 'scale-110' : 'scale-100 opacity-60 hover:opacity-100'}`}>
            <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br ${opt.color} flex items-center justify-center text-3xl sm:text-4xl shadow-lg transition-transform duration-300 ${isSelected ? 'rotate-6 -translate-y-2' : 'group-hover:rotate-3 group-hover:-translate-y-1'}`}>{opt.emoji}</div>
            <span className={`text-xs sm:text-sm font-medium ${isSelected ? 'text-white' : 'text-zinc-400'}`}>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
