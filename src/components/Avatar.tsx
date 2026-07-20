import { getInitials } from "../lib/utils";

interface AvatarProps {
  url?: string | null;
  src?: string | null;
  name?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  ring?: boolean;
}

const sizes = { sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-14 h-14 text-lg", xl: "w-20 h-20 text-2xl" };

export default function Avatar({ url, src, name, size = "md", className = "", ring }: AvatarProps) {
  const sz = sizes[size];
  const imgSrc = src ?? url;
  if (imgSrc) {
    return <img src={imgSrc} alt={name || "Avatar"} className={`${sz} rounded-full object-cover border border-white/10 ${ring ? "ring-2 ring-white/20" : ""} ${className}`} />;
  }
  return (
    <div className={`${sz} rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center font-bold text-white border border-white/10 ${className}`}>
      {getInitials(name || "?")}
    </div>
  );
}

export { Avatar };
