// src/pages/UserSelectPage.js
import React, { useState } from "react";
import { useUser } from "../context/UserContext";
import { ROLE_LABELS, TEAM_LABELS, ROLE_TEAM_MAP, TEAM_ORDER } from "../utils/constants";
import "./UserSelectPage.css";

function getInitials(name) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function UserSelectPage() {
  const { allUsers, selectUser, loadingUsers } = useUser();
  const [search, setSearch] = useState("");

  const filtered = allUsers
    .filter((u) => u.active !== false)
    .filter((u) =>
      !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      ROLE_LABELS[u.role]?.toLowerCase().includes(search.toLowerCase())
    );

  // Group by team
  const grouped = {};
  TEAM_ORDER.forEach((t) => { grouped[t] = []; });
  filtered.forEach((u) => {
    const team = u.team || ROLE_TEAM_MAP[u.role] || "management";
    if (!grouped[team]) grouped[team] = [];
    grouped[team].push(u);
  });

  if (loadingUsers) {
    return (
      <div className="user-select-loading">
        <div className="spinner" style={{ width: 36, height: 36 }} />
      </div>
    );
  }

  return (
    <div className="user-select-page">
      <div className="user-select-inner">
        {/* Brand */}
        <div className="usp-brand">
          <div className="usp-mark">SM</div>
          <div>
            <div className="usp-name">Work Hub</div>
            <div className="usp-sub">StudyMEDIC</div>
          </div>
        </div>

        <h1 className="usp-heading">Who are you?</h1>
        <p className="usp-hint">Select your name to continue. Your selection is remembered on this device.</p>

        <input
          className="input usp-search"
          placeholder="Search by name or role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />

        {allUsers.filter((u) => u.active !== false).length === 0 ? (
          <div className="usp-empty">
            <p>No users set up yet.</p>
            <p style={{ fontSize: 13, marginTop: 6, color: "var(--gray-400)" }}>
              Add users via the Firebase Console or the seed script — see README.
            </p>
          </div>
        ) : (
          <div className="usp-teams">
            {TEAM_ORDER.map((team) => {
              const members = grouped[team];
              if (!members || members.length === 0) return null;
              return (
                <div key={team} className="usp-team">
                  <div className="usp-team-label">{TEAM_LABELS[team]}</div>
                  <div className="usp-members">
                    {members.map((u) => (
                      <button
                        key={u.id}
                        className="usp-member"
                        onClick={() => selectUser(u)}
                      >
                        <div className="usp-avatar">{getInitials(u.name)}</div>
                        <div className="usp-member-info">
                          <div className="usp-member-name">{u.name}</div>
                          <div className="usp-member-role">
                            {ROLE_LABELS[u.role] || u.role}
                          </div>
                        </div>
                        <span className="usp-arrow">→</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
