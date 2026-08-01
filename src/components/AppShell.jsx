import React from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Archive, CircleUserRound, Grid2X2, Info, Music2, Settings2 } from "lucide-react";

const navItems = [
  { to: "/", label: "Floor", sub: "Exhibition", icon: Grid2X2 },
  { to: "/archive", label: "Archive", sub: "Your collection", icon: Archive },
  { to: "/about", label: "About", sub: "Why UP?", icon: Info },
];

export default function AppShell({ children, user, userProfile, membership, isAdmin, playerOpen }) {
  const location = useLocation();
  const nickname = (userProfile?.nickname || user?.displayName || "Guest Listener").trim();
  const levelName = membership?.name || "Listener";

  return (
    <div className={`up-shell ${playerOpen ? "up-shell--player-open" : ""}`}>
      <aside className="up-sidebar" aria-label="Primary navigation">
        <Link to="/" className="up-brand" aria-label="Unframe Playlist home">
          <span className="up-brand__mark">UP</span>
          <span className="up-brand__copy">
            <strong>Unframe</strong>
            <em>Playlist</em>
          </span>
        </Link>

        <nav className="up-nav">
          {navItems.map(({ to, label, sub, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) => `up-nav__item ${isActive ? "is-active" : ""}`}
            >
              {React.createElement(icon, { "aria-hidden": true })}
              <span><strong>{label}</strong><small>{sub}</small></span>
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink to="/admin" className={({ isActive }) => `up-nav__item ${isActive ? "is-active" : ""}`}>
              <Settings2 aria-hidden="true" />
              <span><strong>Studio</strong><small>Admin tools</small></span>
            </NavLink>
          )}
        </nav>

        <div className="up-sidebar__note">
          <Music2 aria-hidden="true" />
          <p>Music issued by<br />UNFRAME only.</p>
          <span>EST. 2024</span>
        </div>
      </aside>

      <div className="up-main">
        <header className="up-topbar">
          <div className="up-topbar__route">
            <span>UP /</span>
            <strong>{location.pathname === "/" ? "EXHIBITION FLOOR" : location.pathname.slice(1).toUpperCase()}</strong>
          </div>

          <Link to="/archive" className="up-member" aria-label="Open listener archive">
            <span className="up-member__avatar"><CircleUserRound aria-hidden="true" /></span>
            <span><strong>{nickname}</strong><small>LV.{membership?.level || 1} · {levelName}</small></span>
          </Link>
        </header>

        <main className="up-content">{children}</main>
      </div>

      <nav className="up-mobile-nav" aria-label="Mobile navigation">
        {navItems.map(({ to, label, icon }) => (
          <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => (isActive ? "is-active" : "")}>
            {React.createElement(icon, { "aria-hidden": true })}
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
