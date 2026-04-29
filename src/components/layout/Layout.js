// src/components/layout/Layout.js
import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import { useDueDateReminders } from "../../hooks/useDueDateReminders";
import { ROLE_LABELS, ROLES } from "../../utils/constants";
import NotificationBell from "../common/NotificationBell";
import "./Layout.css";

function getInitials(name) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function Layout({ children }) {
  const { currentUser, clearUser } = useUser();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useDueDateReminders();

  const isAdmin = currentUser?.role === ROLES.ADMIN;

  return (
    <div className="layout">
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`sidebar ${sidebarOpen ? "sidebar--open" : ""}`}>
        <div className="sidebar-brand">
          <div className="brand-mark">SM</div>
          <div className="brand-text">
            <span className="brand-name">Work Hub</span>
            <span className="brand-sub">StudyMEDIC</span>
          </div>
          <button className="sidebar-close btn-icon" onClick={() => setSidebarOpen(false)}>✕</button>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Menu</div>
          {[
            { path: "/",          label: "Dashboard", icon: "⊞", end: true },
            { path: "/my-tasks",  label: "My Tasks",  icon: "◉" },
            { path: "/documents", label: "Documents", icon: "⊟" },
            { path: "/reports",   label: "Reports",   icon: "◫" },
          ].map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) => `nav-item${isActive ? " nav-item--active" : ""}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}

          {isAdmin && (
            <>
              <div className="nav-section-label" style={{ marginTop: 16 }}>Admin</div>
              <NavLink
                to="/admin"
                className={({ isActive }) => `nav-item${isActive ? " nav-item--active" : ""}`}
                onClick={() => setSidebarOpen(false)}
              >
                <span className="nav-icon">⊕</span>
                User Management
              </NavLink>
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-card" onClick={() => setMenuOpen(!menuOpen)}>
            <div className="avatar">{getInitials(currentUser?.name)}</div>
            <div className="user-info">
              <div className="user-name truncate">{currentUser?.name}</div>
              <div className="user-role">{ROLE_LABELS[currentUser?.role]}</div>
            </div>
            <span className="user-chevron">⌄</span>
          </div>
          {menuOpen && (
            <div className="user-menu">
              <button
                className="user-menu-item"
                onClick={() => { clearUser(); setMenuOpen(false); navigate("/"); }}
              >
                Switch user
              </button>
            </div>
          )}
        </div>
      </aside>

      <div className="main-wrap">
        <div className="mobile-topbar">
          <button className="hamburger" onClick={() => setSidebarOpen(true)}>☰</button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="brand-mark" style={{ width: 28, height: 28, fontSize: 11 }}>SM</div>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--brand)" }}>Work Hub</span>
          </div>
          <NotificationBell />
        </div>

        <div className="desktop-topbar">
          <div style={{ flex: 1 }} />
          <NotificationBell />
        </div>

        <main className="main">
          <div className="main-inner fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}
