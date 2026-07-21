import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

const navSections = [
  {
    label: "Overview",
    items: [{ to: "/business", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" }],
  },
  {
    label: "AI Agent",
    items: [
      { to: "/business/ai-command", label: "AI Command Center", icon: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
      { to: "/business/ai-tasks", label: "AI Task Center", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
      { to: "/business/ai-goals", label: "AI Goals", icon: "M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" },
      { to: "/business/ai-briefings", label: "AI Briefings", icon: "M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" },
      { to: "/business/ai-simulations", label: "AI Simulations", icon: "M9.75 3.104c.251.023.501.05.75.082m0 0a8.25 8.25 0 015.6 1.667c.344.247.67.52.977.813m-6.327-2.48a8.25 8.25 0 00-5.6 1.667c-.344.247-.67.52-.977.813M3 3l1.5 1.5m0 0L3 6m1.5-1.5L6 3M3 21l1.5-1.5m0 0L3 18m1.5 1.5L6 21" },
    ],
  },
  {
    label: "Platform",
    items: [
      { to: "/business/reviews", label: "Reviews", icon: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" },
      { to: "/business/communication", label: "Communication", icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" },
      { to: "/business/workflows", label: "Workflows", icon: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" },
      { to: "/business/customers", label: "Customers", icon: "M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 100-8 4 4 0 000 8zm6-4a3 3 0 11-6 0 3 3 0 016 0z" },
    ],
  },
];

export default function BusinessShell() {
  const navigate = useNavigate();
  const [businessName, setBusinessName] = useState("Your Business");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }
      const { data: ba } = await supabase
        .from("business_admins")
        .select("business_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (ba) {
        const { data: biz } = await supabase
          .from("businesses")
          .select("name")
          .eq("id", ba.business_id)
          .maybeSingle();
        if (biz?.name) setBusinessName(biz.name);
      }
    })();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#050810] text-slate-200">
      {/* Mobile header */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 glass-strong sticky top-0 z-50">
        <span className="font-bold text-white text-lg">RootNova</span>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="btn-ghost p-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sidebarOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
          </svg>
        </button>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`
          ${sidebarOpen ? "block" : "hidden"} lg:block
          fixed lg:sticky top-0 left-0 z-40
          w-72 min-h-screen p-4 space-y-6
          glass border-r border-white/10
          overflow-y-auto scrollbar-thin
        `}>
          <div className="hidden lg:flex items-center gap-3 px-2 pt-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
              <span className="text-white font-bold text-lg">R</span>
            </div>
            <div>
              <div className="font-bold text-white">RootNova</div>
              <div className="text-xs text-slate-400">ReviewFlow</div>
            </div>
          </div>

          <div className="px-2">
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Business</div>
            <div className="text-sm font-semibold text-white truncate">{businessName}</div>
          </div>

          {navSections.map((section) => (
            <div key={section.label} className="space-y-1">
              <div className="text-xs text-slate-500 uppercase tracking-wider px-2">{section.label}</div>
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/business"}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                    ${isActive
                      ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                      : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
                    }
                  `}
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                  </svg>
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}

          <div className="pt-4 border-t border-white/5">
            <button
              onClick={async () => { await supabase.auth.signOut(); navigate("/login"); }}
              className="btn-ghost w-full justify-start text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-h-screen p-4 lg:p-8 max-w-[1600px] mx-auto w-full">
          <Outlet />
        </main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-30" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  );
}
