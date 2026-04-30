// src/pages/MyTasksPage.js
import React, { useState, useEffect } from "react";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "../firebase/config";
import { useUser } from "../context/UserContext";
import {
  STAGE_LABELS, STAGE_COLORS, PRIORITY_COLORS,
  TASK_TYPE_LABELS, ROLE_LABELS,
} from "../utils/constants";
import { format, isPast, isWithinInterval, addHours } from "date-fns";
import { useNavigate } from "react-router-dom";
import "./MyTasksPage.css";

function getInitials(name) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function getDueBadge(dueDate, stage) {
  if (!dueDate || ["delivered","ext_delivered"].includes(stage)) return null;
  const due = dueDate.toDate?.() || new Date(dueDate);
  const now = new Date();
  if (isPast(due)) return { label: "Overdue", color: "#b91c1c", bg: "#fef2f2" };
  if (isWithinInterval(now, { start: now, end: addHours(due, 0) }) && due <= addHours(now, 24))
    return { label: "Due soon", color: "#c2410c", bg: "#fff7ed" };
  return null;
}

export default function MyTasksPage() {
  const { currentUser, allUsers } = useUser();
  const [allTasks, setAllTasks] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState("assigned"); // assigned | created | all
  const navigate = useNavigate();

  const usersMap = Object.fromEntries(allUsers.map((u) => [u.id, u]));

  useEffect(() => {
    if (!currentUser?.id) return;
    const q = query(collection(db, "tasks"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      setAllTasks(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, [currentUser?.id]);

  const assignedToMe = allTasks.filter(
    (t) => t.assignedTo === currentUser?.id && !["delivered","ext_delivered"].includes(t.stage)
  );
  const createdByMe = allTasks.filter(
    (t) => t.createdBy === currentUser?.id
  );
  const needsMyAction = allTasks.filter((t) => {
    const r = currentUser?.role;
    if (t.stage === "content_review" && r === "content_lead") return true;
    if (t.stage === "design_review"  && r === "design_lead")  return true;
    if (t.stage === "video_review"   && r === "video_lead")   return true;
    if (t.stage === "creative_review"&& r === "creative_head")return true;
    if (t.stage === "ext_review" && t.assignedBy === currentUser?.id) return true;
    if ((t.stage === "initiated" || t.stage === "design_assigned" || t.stage === "video_assigned")
        && ["content_lead","design_lead","video_lead"].includes(r)) return true;
    return false;
  });

  const overdueAssigned = assignedToMe.filter((t) => {
    if (!t.dueDate) return false;
    return isPast(t.dueDate.toDate?.() || new Date(t.dueDate));
  });

  const tabs = [
    { key: "assigned", label: "Assigned to me", count: assignedToMe.length },
    { key: "action",   label: "Needs my action", count: needsMyAction.length },
    { key: "created",  label: "Created by me",   count: createdByMe.length },
  ];

  const displayTasks =
    activeTab === "assigned" ? assignedToMe :
    activeTab === "action"   ? needsMyAction :
    createdByMe;

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  );

  return (
    <div className="my-tasks-page fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Tasks</h1>
          <p className="page-subtitle">
            {currentUser?.name} · {ROLE_LABELS[currentUser?.role]}
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="my-tasks-summary">
        <div className="summary-card card">
          <div className="summary-value">{assignedToMe.length}</div>
          <div className="summary-label">Active tasks</div>
        </div>
        <div className="summary-card card" style={{ background: needsMyAction.length > 0 ? "#fffbea" : "#fff" }}>
          <div className="summary-value" style={{ color: needsMyAction.length > 0 ? "#d97706" : undefined }}>
            {needsMyAction.length}
          </div>
          <div className="summary-label">Needs my action</div>
        </div>
        <div className="summary-card card" style={{ background: overdueAssigned.length > 0 ? "#fef2f2" : "#fff" }}>
          <div className="summary-value" style={{ color: overdueAssigned.length > 0 ? "#b91c1c" : undefined }}>
            {overdueAssigned.length}
          </div>
          <div className="summary-label">Overdue</div>
        </div>
        <div className="summary-card card">
          <div className="summary-value">{createdByMe.length}</div>
          <div className="summary-label">Created by me</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="my-tasks-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`my-tasks-tab ${activeTab === tab.key ? "my-tasks-tab--active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
            <span className="tab-count">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Task list */}
      {displayTasks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">✓</div>
          <div className="empty-state-text">Nothing here — all clear!</div>
        </div>
      ) : (
        <div className="my-tasks-list">
          {displayTasks.map((task) => {
            const dueBadge = getDueBadge(task.dueDate, task.stage);
            const assignee = usersMap[task.assignedTo];
            const creator  = usersMap[task.createdBy];
            return (
              <div
                key={task.id}
                className={`my-task-row card ${dueBadge?.label === "Overdue" ? "my-task-row--overdue" : ""}`}
                onClick={() => navigate(`/tasks/${task.id}`)}
              >
                <div className="my-task-left">
                  <div className="my-task-badges">
                    <span className="badge" style={{ background: STAGE_COLORS[task.stage], color: "#444" }}>
                      {STAGE_LABELS[task.stage]}
                    </span>
                    <span className="badge" style={{ background: PRIORITY_COLORS[task.priority]?.bg, color: PRIORITY_COLORS[task.priority]?.text }}>
                      {task.priority}
                    </span>
                    {dueBadge && (
                      <span className="badge" style={{ background: dueBadge.bg, color: dueBadge.color, fontWeight: 600 }}>
                        {dueBadge.label}
                      </span>
                    )}
                  </div>
                  <div className="my-task-title">{task.title}</div>
                  <div className="my-task-meta">
                    <span>{TASK_TYPE_LABELS[task.type]}</span>
                    {creator && <span>· by {creator.name}</span>}
                  </div>
                </div>
                <div className="my-task-right">
                  {task.dueDate && (
                    <div className="my-task-due" style={dueBadge ? { color: dueBadge.color, fontWeight: 600 } : {}}>
                      {format(task.dueDate.toDate?.() || new Date(task.dueDate), "MMM d, yyyy")}
                    </div>
                  )}
                  <div className="my-task-arrow">→</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
