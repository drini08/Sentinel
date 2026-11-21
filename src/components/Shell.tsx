import { Bell, ChevronDown, CircleUserRound } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { Brand } from "./Brand";
import { RouteContent } from "./RouteContent";

const navigation = [
  ["Overview", "/"],
  ["Facility", "/facility"],
  ["Security", "/security"],
  ["Demo", "/demo"],
];

export function Shell() {
  return (
    <div className="app-scale theme-hybrid min-h-screen bg-sentinel text-primary selection:bg-white selection:text-black">
      <header className="sticky top-0 z-50 border-b border-white/[0.055] bg-[#080c12]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[1480px] items-center gap-8 px-5 lg:px-8">
          <NavLink to="/" aria-label="SENTINEL overview" className="shrink-0"><Brand /></NavLink>
          <nav aria-label="Primary navigation" className="no-scrollbar mx-auto flex min-w-0 items-center gap-3 overflow-x-auto">
            {navigation.map(([label, to]) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <button className="icon-button hidden sm:grid" aria-label="Notifications"><Bell size={16} strokeWidth={1.7} /></button>
            <NavLink to="/settings" className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 text-secondary hover:bg-white/[0.05] hover:text-white" aria-label="Open settings">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-white/[0.07]"><CircleUserRound size={18} strokeWidth={1.6} /></span>
              <ChevronDown className="hidden sm:block" size={13} />
            </NavLink>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1480px] px-5 pb-16 pt-8 lg:px-8 lg:pt-12">
        <RouteContent><Outlet /></RouteContent>
      </main>
      <footer className="border-t border-white/[0.055] px-5 py-7 text-[11px] tracking-[0.14em] text-muted lg:px-8">
        <div className="mx-auto flex max-w-[1416px] items-center justify-between">
          <span>SENTINEL / OPERATOR CONSOLE</span><span>SIMULATION ENVIRONMENT</span>
        </div>
      </footer>
    </div>
  );
}
