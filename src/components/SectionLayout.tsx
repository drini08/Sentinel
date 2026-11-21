import { NavLink, Outlet } from "react-router-dom";

export function SectionLayout({ label, tabs }: { label: string; tabs: Array<[string, string, boolean?]> }) {
  return <div>
    <div className="section-bar" aria-label={`${label} navigation`}>
      <span>{label}</span>
      <nav>{tabs.map(([name, to, end]) => <NavLink key={to} to={to} end={end} className={({ isActive }) => isActive ? "is-active" : ""}>{name}</NavLink>)}</nav>
    </div>
    <Outlet />
  </div>;
}
