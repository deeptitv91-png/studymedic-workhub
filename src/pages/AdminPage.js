// src/pages/AdminPage.js
import React, { useState } from "react";
import { useUser } from "../context/UserContext";
import { ROLES, ROLE_LABELS, TEAM_LABELS, ROLE_TEAM_MAP, TEAM_ORDER } from "../utils/constants";
import "./AdminPage.css";

function getInitials(name) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}


export default function AdminPage() {
  const { currentUser, allUsers, addUser, updateUser, removeUser } = useUser();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId]   = useState(null);
  const [editRole, setEditRole]     = useState("");
  const [newUser, setNewUser]       = useState({ name: "", role: ROLES.CONTENT_MEMBER });
  const [createLoading, setCreateLoading] = useState(false);
  const [error, setError]           = useState("");

  if (currentUser?.role !== ROLES.ADMIN) {
    return (
      <div className="empty-state" style={{ padding: "100px 0" }}>
        <div className="empty-state-icon">🔒</div>
        <div className="empty-state-text">Admin access only</div>
      </div>
    );
  }

  const grouped = {};
  TEAM_ORDER.forEach((t) => { grouped[t] = []; });
  allUsers.forEach((u) => {
    const team = u.team || ROLE_TEAM_MAP[u.role] || "management";
    if (!grouped[team]) grouped[team] = [];
    grouped[team].push(u);
  });

  async function handleCreate(e) {
    e.preventDefault();
    if (!newUser.name.trim()) return setError("Name is required.");
    setCreateLoading(true); setError("");
    try {
      await addUser({ name: newUser.name.trim(), role: newUser.role });
      setShowCreate(false);
      setNewUser({ name: "", role: ROLES.CONTENT_MEMBER });
    } catch (err) { setError("Failed to create user."); }
    setCreateLoading(false);
  }

  async function handleUpdateRole(id) {
    await updateUser(id, { role: editRole });
    setEditingId(null);
  }

  async function handleToggleActive(u) {
    await updateUser(u.id, { active: u.active === false ? true : false });
  }

  async function handleRemove(u) {
    if (!window.confirm(`Remove ${u.name} permanently?`)) return;
    await removeUser(u.id);
  }

  return (
    <div className="admin-page fade-in">
      <div className="page-header">
        <div><h1 className="page-title">User Management</h1><p className="page-subtitle">{allUsers.length} team members — no passwords, no login</p></div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Add User</button>
      </div>

      <div className="team-sections">
        {TEAM_ORDER.map((team) => {
          const members = grouped[team];
          if (!members?.length) return null;
          return (
            <div key={team} className="card team-section">
              <div className="team-section-header">
                <h3 className="team-section-title">{TEAM_LABELS[team]}</h3>
                <span style={{ fontSize: 12, color: "var(--gray-400)" }}>{members.length} members</span>
              </div>
              <div className="users-table-wrap">
                <table className="users-table">
                  <thead><tr><th>Name</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {members.map((u) => (
                      <tr key={u.id} style={{ opacity: u.active === false ? 0.5 : 1 }}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div className="avatar">{getInitials(u.name)}</div>
                            <span style={{ fontWeight: 500 }}>{u.name}</span>
                          </div>
                        </td>
                        <td>
                          {editingId === u.id
                            ? <select className="input" style={{ width: "auto", fontSize: 12, padding: "4px 8px" }} defaultValue={u.role} onChange={(e) => setEditRole(e.target.value)}>
                                {Object.entries(ROLE_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                              </select>
                            : <span className="badge" style={{ background: "var(--brand-light)", color: "var(--brand2)" }}>{ROLE_LABELS[u.role] || u.role}</span>}
                        </td>
                        <td>
                          <span className="badge" style={{ background: u.active === false ? "var(--gray-100)" : "var(--green-50)", color: u.active === false ? "var(--gray-500)" : "var(--green-700)" }}>
                            {u.active === false ? "Inactive" : "Active"}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 7 }}>
                            {editingId === u.id
                              ? <><button className="btn btn-primary btn-sm" onClick={() => handleUpdateRole(u.id)}>Save</button><button className="btn btn-secondary btn-sm" onClick={() => setEditingId(null)}>Cancel</button></>
                              : <button className="btn btn-secondary btn-sm" onClick={() => { setEditingId(u.id); setEditRole(u.role); }}>Edit role</button>}
                            {u.id !== currentUser.id && (
                              <button className="btn btn-secondary btn-sm" onClick={() => handleToggleActive(u)}>
                                {u.active === false ? "Activate" : "Deactivate"}
                              </button>
                            )}
                            {u.id !== currentUser.id && (
                              <button className="btn btn-danger btn-sm" onClick={() => handleRemove(u)}>Remove</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {showCreate && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="modal">
            <div className="modal-header"><h3 className="modal-title">Add New User</h3><button className="btn btn-secondary btn-sm" onClick={() => setShowCreate(false)}>✕</button></div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                {error && <div style={{ color: "var(--red-700)", background: "var(--red-50)", padding: "8px 12px", borderRadius: 6, marginBottom: 14, fontSize: 13 }}>{error}</div>}
                <div style={{ background: "var(--blue-50)", border: "1px solid #bfdbfe", borderRadius: 7, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "var(--blue-700)" }}>
                  No password needed. The user will simply select their name when they open the app.
                </div>
                <div className="form-group">
                  <label className="label">Full name *</label>
                  <input className="input" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} placeholder="e.g. Priya Nair" required autoFocus />
                </div>
                <div className="form-group">
                  <label className="label">Role *</label>
                  <select className="input" value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
                    {Object.entries(ROLE_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                  </select>
                </div>
                <div style={{ fontSize: 12, color: "var(--gray-400)" }}>Team is set automatically based on role.</div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={createLoading}>{createLoading ? <span className="spinner" /> : "Add User"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
