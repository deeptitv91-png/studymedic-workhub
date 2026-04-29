// src/pages/TaskDetailPage.js
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc, onSnapshot, updateDoc, serverTimestamp, arrayUnion
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase/config";
import { useUser } from "../context/UserContext";
import { useNotifications } from "../context/NotificationContext";
import {
  STAGE_LABELS, STAGE_COLORS, PRIORITY_COLORS,
  TASK_TYPE_LABELS, ROLE_LABELS,
} from "../utils/constants";
import {
  getAvailableActions, getNextStageOnApprove,
  getNextStageOnReject, getNextStageOnSubmit,
  getNextStageOnAllocate, getAssignableRoles,
} from "../utils/workflow";
import { format } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import "./TaskDetailPage.css";

function getInitials(n) {
  if (!n) return "?";
  return n.split(" ").map((x) => x[0]).join("").toUpperCase().slice(0, 2);
}

export default function TaskDetailPage() {
  const { taskId }     = useParams();
  const navigate       = useNavigate();
  const { currentUser, allUsers } = useUser();
  const [task, setTask]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [comment, setComment]     = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject]     = useState(false);
  const [showAssign, setShowAssign]     = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState("");
  const [uploading, setUploading]   = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const fileRef = useRef();

  const usersMap = Object.fromEntries(allUsers.map((u) => [u.id, u]));
  const { sendNotification, notifyAutoRoute, notifyByRole } = useNotifications();

  useEffect(() => {
    return onSnapshot(doc(db, "tasks", taskId), (snap) => {
      setTask(snap.exists() ? { id: snap.id, ...snap.data() } : null);
      setLoading(false);
    });
  }, [taskId]);

  async function handleSubmit() {
    const next = getNextStageOnSubmit(task);
    if (!next) return;
    await patch({ stage: next }, { action: "submitted_for_review", stage: next, prevStage: task.stage });
  }

  async function patch(updates, historyEntry) {
    setActionBusy(true);
    await updateDoc(doc(db, "tasks", taskId), {
      ...updates,
      history: arrayUnion({ ...historyEntry, by: currentUser.id, byName: currentUser.name, timestamp: new Date() }),
      updatedAt: serverTimestamp(),
    });
    setActionBusy(false);
  }

  async function handleApprove() {
    const next = getNextStageOnApprove(task);
    await patch({ stage: next }, { action: "approved", stage: next, prevStage: task.stage });
  }

  async function handleReject() {
    if (!rejectReason.trim()) return;
    const next = getNextStageOnReject(task);
    setActionBusy(true);
    await updateDoc(doc(db, "tasks", taskId), {
      stage: next,
      comments: arrayUnion({ id: uuidv4(), text: `Rejected: ${rejectReason}`, by: currentUser.id, byName: currentUser.name, timestamp: new Date(), isRejection: true }),
      history: arrayUnion({ action: "rejected", reason: rejectReason, stage: next, prevStage: task.stage, by: currentUser.id, byName: currentUser.name, timestamp: new Date() }),
      updatedAt: serverTimestamp(),
    });
    // Notify the assignee
    if (task.assignedTo && task.assignedTo !== currentUser.id) {
      await sendNotification({
        userId: task.assignedTo,
        type: "rejected",
        message: `Your work on "${task.title}" was rejected: ${rejectReason}`,
        taskId: task.id,
        taskTitle: task.title,
      });
    }
    setActionBusy(false);
    setShowReject(false);
    setRejectReason("");
  }

  async function handleSubmit() {
    const next = getNextStageOnSubmit(task);
    await patch({ stage: next }, { action: "submitted_for_review", stage: next, prevStage: task.stage });
  }

  async function handleMarkInProgress() {
    const map = { content_assigned: "content_in_progress", design_assigned: "design_in_progress", video_assigned: "video_in_progress" };
    const next = map[task.stage];
    if (next) await patch({ stage: next }, { action: "started_work", stage: next, prevStage: task.stage });
  }

  async function handleAssign() {
    if (!selectedAssignee) return;
    const next = getNextStageOnAllocate(task) || task.stage;
    const assignee = usersMap[selectedAssignee];
    await patch(
      { stage: next, assignedTo: selectedAssignee, assignedBy: currentUser.id },
      { action: "assigned", assignedTo: selectedAssignee, assigneeName: assignee?.name, stage: next, prevStage: task.stage }
    );
    // Notify the person being assigned
    await sendNotification({
      userId: selectedAssignee,
      type: "assigned",
      message: `You have been assigned "${task.title}" by ${currentUser.name}.`,
      taskId: task.id,
      taskTitle: task.title,
    });
    setShowAssign(false);
    setSelectedAssignee("");
  }

  async function handleAddComment() {
    if (!comment.trim()) return;
    await updateDoc(doc(db, "tasks", taskId), {
      comments: arrayUnion({ id: uuidv4(), text: comment.trim(), by: currentUser.id, byName: currentUser.name, timestamp: new Date() }),
      updatedAt: serverTimestamp(),
    });
    setComment("");
  }

  async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const fileRef2 = ref(storage, `tasks/${taskId}/${Date.now()}_${file.name}`);
      await uploadBytes(fileRef2, file);
      const url = await getDownloadURL(fileRef2);
      await updateDoc(doc(db, "tasks", taskId), {
        attachments: arrayUnion({ id: uuidv4(), name: file.name, url, size: file.size, uploadedBy: currentUser.id, uploadedByName: currentUser.name, uploadedAt: new Date() }),
        updatedAt: serverTimestamp(),
      });
    } catch (err) { console.error(err); }
    setUploading(false);
  }

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 80 }}><div className="spinner" style={{ width: 32, height: 32 }} /></div>;
  if (!task)   return <div style={{ padding: 40 }}>Task not found.</div>;

  const actions = getAvailableActions(task, currentUser);
  const assignableRoles = getAssignableRoles(task);
  const assignableUsers = allUsers.filter((u) => assignableRoles.includes(u.role));
  const creator        = usersMap[task.createdBy];
  const assignee       = usersMap[task.assignedTo];
  const isOverdue      = task.dueDate && !["delivered","ext_delivered"].includes(task.stage) && new Date(task.dueDate.toDate?.() || task.dueDate) < new Date();

  return (
    <div className="task-detail fade-in">
      <button className="btn btn-secondary btn-sm" style={{ marginBottom: 20 }} onClick={() => navigate(-1)}>← Back</button>

      <div className="td-grid">
        {/* Left */}
        <div>
          <div className="card section-card" style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              <span className="badge" style={{ background: STAGE_COLORS[task.stage], color: "#444" }}>{STAGE_LABELS[task.stage]}</span>
              <span className="badge" style={{ background: PRIORITY_COLORS[task.priority]?.bg, color: PRIORITY_COLORS[task.priority]?.text }}>{task.priority} priority</span>
              <span className="badge" style={{ background: "#e8f4fd", color: "#0e6ba8" }}>{TASK_TYPE_LABELS[task.type]}</span>
            </div>
            <h1 className="td-title">{task.title}</h1>
            {task.description && <p className="td-desc">{task.description}</p>}

            <div className="action-bar">
              {actions.canAllocate && assignableUsers.length > 0 && (
                <button className="btn btn-primary" onClick={() => setShowAssign(true)} disabled={actionBusy}>Assign Task</button>
              )}
              {/* Member submits their own work — triggers auto-routing */}
              {["content_in_progress","design_in_progress","video_in_progress","ext_in_progress"].includes(task.stage)
                && task.assignedTo === currentUser?.id && (
                <button className="btn btn-primary" onClick={handleSubmit} disabled={actionBusy}>Submit for Review</button>
              )}
              {actions.canApprove && (
                <button className="btn btn-success" onClick={handleApprove} disabled={actionBusy}>✓ Approve</button>
              )}
              {actions.canReject && (
                <button className="btn btn-danger" onClick={() => setShowReject(true)} disabled={actionBusy}>✕ Reject</button>
              )}
              {!actions.canAllocate && !actions.canApprove && !actions.canReject
                && !(["content_in_progress","design_in_progress","video_in_progress","ext_in_progress"].includes(task.stage) && task.assignedTo === currentUser?.id)
                && (
                <span style={{ fontSize: 12, color: "var(--gray-400)" }}>
                  Waiting for next action in the workflow.
                </span>
              )}
            </div>
          </div>

          {/* Attachments */}
          <div className="card section-card" style={{ marginBottom: 16 }}>
            <div className="section-header">
              <h3 className="section-title">Attachments</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? <span className="spinner" /> : "+ Upload"}
              </button>
              <input ref={fileRef} type="file" style={{ display: "none" }} onChange={handleUpload} />
            </div>
            {!task.attachments?.length
              ? <div style={{ fontSize: 12, color: "var(--gray-400)" }}>No attachments yet</div>
              : task.attachments.map((a) => (
                <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="attachment-row">
                  <span>📎</span>
                  <span className="truncate">{a.name}</span>
                  <span style={{ fontSize: 11, color: "var(--gray-400)", marginLeft: "auto", whiteSpace: "nowrap" }}>
                    {a.uploadedByName} · {a.uploadedAt && format(a.uploadedAt.toDate?.() || new Date(a.uploadedAt), "MMM d")}
                  </span>
                </a>
              ))}
          </div>

          {/* Comments */}
          <div className="card section-card">
            <h3 className="section-title" style={{ marginBottom: 14 }}>Comments</h3>
            <div className="comments-list">
              {!task.comments?.length
                ? <div style={{ fontSize: 12, color: "var(--gray-400)", marginBottom: 12 }}>No comments yet</div>
                : [...task.comments]
                    .sort((a, b) => new Date(a.timestamp?.toDate?.() || a.timestamp) - new Date(b.timestamp?.toDate?.() || b.timestamp))
                    .map((c) => (
                      <div key={c.id} className={`comment-row${c.isRejection ? " comment-rejection" : ""}`}>
                        <div className="avatar">{getInitials(c.byName)}</div>
                        <div className="comment-body">
                          <div className="comment-meta">
                            <span className="comment-author">{c.byName}</span>
                            <span className="comment-time">{c.timestamp && format(c.timestamp.toDate?.() || new Date(c.timestamp), "MMM d, h:mm a")}</span>
                          </div>
                          <div className="comment-text">{c.text}</div>
                        </div>
                      </div>
                    ))}
            </div>
            <div className="comment-input">
              <div className="avatar">{getInitials(currentUser?.name)}</div>
              <input className="input" placeholder="Add a comment..." value={comment} onChange={(e) => setComment(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddComment()} style={{ flex: 1 }} />
              <button className="btn btn-primary btn-sm" onClick={handleAddComment} disabled={!comment.trim()}>Send</button>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div>
          <div className="card section-card" style={{ marginBottom: 14 }}>
            <h3 className="section-title" style={{ marginBottom: 14 }}>Details</h3>
            {[
              ["Created by", <span style={{ display: "flex", alignItems: "center", gap: 6 }}><div className="avatar" style={{ width: 20, height: 20, fontSize: 9 }}>{getInitials(creator?.name)}</div>{creator?.name || "—"}</span>],
              ["Assigned to", assignee ? <span style={{ display: "flex", alignItems: "center", gap: 6 }}><div className="avatar" style={{ width: 20, height: 20, fontSize: 9 }}>{getInitials(assignee.name)}</div>{assignee.name}</span> : "—"],
              ["Role", assignee ? ROLE_LABELS[assignee.role] : "—"],
              ["Due date", task.dueDate ? <span style={isOverdue ? { color: "var(--red-700)", fontWeight: 600 } : {}}>{format(task.dueDate.toDate?.() || new Date(task.dueDate), "MMM d, yyyy")}</span> : "—"],
              ["Created", task.createdAt ? format(task.createdAt.toDate?.() || new Date(task.createdAt), "MMM d, yyyy") : "—"],
            ].map(([label, value]) => (
              <div key={label} className="detail-row">
                <span style={{ color: "var(--gray-500)", fontSize: 13 }}>{label}</span>
                <span style={{ fontWeight: 500, fontSize: 13, color: "var(--gray-800)" }}>{value}</span>
              </div>
            ))}
          </div>

          <div className="card section-card">
            <h3 className="section-title" style={{ marginBottom: 12 }}>Activity Log</h3>
            {[...(task.history || [])]
              .sort((a, b) => new Date(b.timestamp?.toDate?.() || b.timestamp) - new Date(a.timestamp?.toDate?.() || a.timestamp))
              .map((h, i) => (
                <div key={i} className="history-item">
                  <div className="history-dot" />
                  <div>
                    <div style={{ fontSize: 12, color: "var(--gray-700)", lineHeight: 1.5 }}>
                      <strong style={{ color: "var(--gray-900)" }}>{h.byName}</strong> {formatAction(h)}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--gray-400)", marginTop: 1 }}>
                      {h.timestamp && format(h.timestamp.toDate?.() || new Date(h.timestamp), "MMM d, h:mm a")}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Assign modal */}
      {showAssign && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowAssign(false)}>
          <div className="modal">
            <div className="modal-header"><h3 className="modal-title">Assign Task</h3><button className="btn btn-secondary btn-sm" onClick={() => setShowAssign(false)}>✕</button></div>
            <div className="modal-body">
              <div className="form-group">
                <label className="label">Select team member</label>
                <select className="input" value={selectedAssignee} onChange={(e) => setSelectedAssignee(e.target.value)}>
                  <option value="">— Choose a person —</option>
                  {assignableUsers.map((u) => <option key={u.id} value={u.id}>{u.name} ({ROLE_LABELS[u.role]})</option>)}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAssign(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAssign} disabled={!selectedAssignee}>Assign</button>
            </div>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {showReject && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowReject(false)}>
          <div className="modal">
            <div className="modal-header"><h3 className="modal-title">Reject & Request Changes</h3><button className="btn btn-secondary btn-sm" onClick={() => setShowReject(false)}>✕</button></div>
            <div className="modal-body">
              <div className="form-group">
                <label className="label">Reason for rejection *</label>
                <textarea className="input" rows={4} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Explain what needs to be changed..." autoFocus style={{ resize: "vertical" }} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowReject(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleReject} disabled={!rejectReason.trim()}>Send Back with Comments</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatAction(h) {
  const map = {
    created:              "created this task",
    assigned:             `assigned to ${h.assigneeName || "someone"}`,
    started_work:         "started working",
    submitted_for_review: "submitted for review",
    approved:             `approved → ${STAGE_LABELS[h.stage] || h.stage}`,
    rejected:             `rejected (${h.reason || "see comments"})`,
  };
  return map[h.action] || h.action;
}
