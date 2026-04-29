// src/pages/DashboardPage.js
import React, { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";
import { useUser } from "../context/UserContext";
import {
  STAGE_LABELS, STAGE_COLORS, PRIORITY_COLORS,
  TASK_TYPE_LABELS, KANBAN_COLUMNS, ROLE_LABELS,
} from "../utils/constants";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import CreateTaskModal from "../components/tasks/CreateTaskModal";
import "./DashboardPage.css";

function getInitials(name) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function TaskCard({ task, users }) {
  const navigate = useNavigate();
  const assignee = users[task.assignedTo];
  const isOverdue =
    task.dueDate &&
    !["delivered", "ext_delivered"].includes(task.stage) &&
    new Date(task.dueDate.toDate?.() || task.dueDate) < new Date();

  return (
    <div className="task-card" onClick={() => navigate(`/tasks/${task.id}`)}>
      <div className="task-card-badges">
        <span className="badge" style={{ background: STAGE_COLORS[task.stage] || "#f0f2f5", color: "#444" }}>
          {STAGE_LABELS[task.stage] || task.stage}
        </span>
        <span className="badge" style={{ background: PRIORITY_COLORS[task.priority]?.bg, color: PRIORITY_COLORS[task.priority]?.text }}>
          {task.priority}
        </span>
      </div>
      <div className="task-card-title">{task.title}</div>
      {task.description && <div className="task-card-desc">{task.description}</div>}
      <div className="task-card-type">{TASK_TYPE_LABELS[task.type]}</div>
      <div className="task-card-footer">
        <div className="task-assignee">
          {assignee
            ? <><div className="avatar" style={{ width: 22, height: 22, fontSize: 9 }}>{getInitials(assignee.name)}</div><span className="truncate">{assignee.name}</span></>
            : <span className="text-muted" style={{ fontSize: 12 }}>Unassigned</span>}
        </div>
        {task.dueDate && (
          <span className={`due-badge${isOverdue ? " due-overdue" : ""}`}>
            {format(task.dueDate.toDate?.() || new Date(task.dueDate), "MMM d")}
          </span>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { currentUser, allUsers } = useUser();
  const [tasks, setTasks]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch]       = useState("");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterType, setFilterType]         = useState("all");

  const usersMap = Object.fromEntries(allUsers.map((u) => [u.id, u]));

  useEffect(() => {
    const q = query(collection(db, "tasks"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      setTasks(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, []);

  const filtered = tasks.filter((t) => {
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    if (filterType !== "all" && t.type !== filterType) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total:    tasks.length,
    active:   tasks.filter((t) => t.stage?.includes("in_progress")).length,
    review:   tasks.filter((t) => t.stage?.includes("review")).length,
    delivered:tasks.filter((t) => ["delivered", "ext_delivered"].includes(t.stage)).length,
    overdue:  tasks.filter((t) => {
      if (!t.dueDate || ["delivered", "ext_delivered"].includes(t.stage)) return false;
      return new Date(t.dueDate.toDate?.() || t.dueDate) < new Date();
    }).length,
  };

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 80 }}><div className="spinner" style={{ width: 32, height: 32 }} /></div>;

  return (
    <div className="dashboard fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Hello, {currentUser?.name?.split(" ")[0]} · {ROLE_LABELS[currentUser?.role]}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New Task</button>
      </div>

      {/* Stats */}
      <div className="stats-row">
        {[
          { label: "Total",       value: stats.total,     bg: "#fff" },
          { label: "In Progress", value: stats.active,    bg: "#f0f0ff" },
          { label: "Under Review",value: stats.review,    bg: "#fffbea" },
          { label: "Delivered",   value: stats.delivered, bg: "#f0fdf4" },
          { label: "Overdue",     value: stats.overdue,   bg: "#fff0f0" },
        ].map((s) => (
          <div key={s.label} className="stat-card card" style={{ background: s.bg }}>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="dash-filters">
        <input className="input" placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 260 }} />
        <select className="input" style={{ width: 180 }} value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
          <option value="all">All priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select className="input" style={{ width: 210 }} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="all">All types</option>
          <option value="pm_content_design">PM → Content + Design</option>
          <option value="pm_content_video">PM → Content + Video</option>
          <option value="external">External Work</option>
        </select>
      </div>

      {/* Kanban */}
      <div className="kanban">
        {KANBAN_COLUMNS.map((col) => {
          const colTasks = filtered.filter((t) => col.stages.includes(t.stage));
          return (
            <div key={col.key} className="kanban-col">
              <div className="kanban-col-header">
                <span className="kanban-col-title">{col.label}</span>
                <span className="kanban-col-count">{colTasks.length}</span>
              </div>
              <div className="kanban-col-cards">
                {colTasks.length === 0
                  ? <div className="kanban-empty">No tasks</div>
                  : colTasks.map((t) => <TaskCard key={t.id} task={t} users={usersMap} />)}
              </div>
            </div>
          );
        })}
      </div>

      {showCreate && <CreateTaskModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
