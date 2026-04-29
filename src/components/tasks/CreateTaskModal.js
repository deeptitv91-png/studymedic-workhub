// src/components/tasks/CreateTaskModal.js
import React, { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useUser } from "../../context/UserContext";
import { TASK_TYPES, PRIORITIES, ROLES } from "../../utils/constants";

export default function CreateTaskModal({ onClose }) {
  const { currentUser } = useUser();
  const [form, setForm] = useState({
    title: "", description: "",
    type: TASK_TYPES.PM_CONTENT_DESIGN,
    priority: PRIORITIES.MEDIUM,
    dueDate: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const canPM = [ROLES.PM_MEMBER, ROLES.ADMIN].includes(currentUser?.role);
  const canExternal = [
    ROLES.CONTENT_LEAD, ROLES.DESIGN_LEAD, ROLES.VIDEO_LEAD,
    ROLES.SEO_LEAD, ROLES.SOCIAL_MEDIA_LEAD,
    ROLES.CREATIVE_HEAD, ROLES.ASSISTANT_MANAGER, ROLES.AVP, ROLES.ADMIN,
  ].includes(currentUser?.role);

  const types = [
    ...(canPM ? [
      { value: TASK_TYPES.PM_CONTENT_DESIGN, label: "PM → Content + Design" },
      { value: TASK_TYPES.PM_CONTENT_VIDEO,  label: "PM → Content + Video" },
    ] : []),
    ...(canExternal ? [{ value: TASK_TYPES.EXTERNAL, label: "External Work" }] : []),
  ];

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) return setError("Title is required.");
    if (types.length === 0) return setError("Your role cannot create tasks.");
    setLoading(true); setError("");
    const initialStage = form.type === TASK_TYPES.EXTERNAL ? "ext_initiated" : "initiated";
    try {
      await addDoc(collection(db, "tasks"), {
        title:       form.title.trim(),
        description: form.description.trim(),
        type:        form.type,
        priority:    form.priority,
        dueDate:     form.dueDate ? new Date(form.dueDate) : null,
        stage:       initialStage,
        createdBy:   currentUser.id,
        assignedTo:  null,
        assignedBy:  null,
        attachments: [],
        comments:    [],
        history: [{
          action:    "created",
          by:        currentUser.id,
          byName:    currentUser.name,
          stage:     initialStage,
          timestamp: new Date(),
        }],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      onClose();
    } catch (err) {
      setError("Failed to create task. Please try again.");
    }
    setLoading(false);
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 className="modal-title">New Task</h3>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div style={{ color: "var(--red-700)", background: "var(--red-50)", padding: "8px 12px", borderRadius: 6, marginBottom: 14, fontSize: 13 }}>{error}</div>}
            <div className="form-group">
              <label className="label">Task title *</label>
              <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Instagram post for MRCP course" required autoFocus />
            </div>
            <div className="form-group">
              <label className="label">Description</label>
              <textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What needs to be done?" style={{ resize: "vertical" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="form-group">
                <label className="label">Task type</label>
                <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {types.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="label">Priority</label>
                <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="label">Due date</label>
              <input className="input" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
