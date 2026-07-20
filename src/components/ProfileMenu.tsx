import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Avatar from "./Avatar";

export default function ProfileMenu() {
  const { profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 rounded-lg p-1 hover:bg-slate-800 transition">
        <Avatar url={profile?.avatar_url} name={profile?.full_name} size="sm" />
        <span className="text-sm text-slate-300 hidden md:block">{profile?.full_name}</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-xl py-2 z-50">
          <div className="px-4 py-2 border-b border-slate-800">
            <p className="text-sm font-medium text-white">{profile?.full_name}</p>
            <p className="text-xs text-slate-500">{profile?.email}</p>
          </div>
          <button onClick={() => { setOpen(false); signOut(); navigate("/login"); }} className="w-full text-left px-4 py-2 text-sm text-rose-400 hover:bg-slate-800 transition">
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
