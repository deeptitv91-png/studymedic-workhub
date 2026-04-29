// src/components/common/NotificationBell.js
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../../context/NotificationContext";
import { formatDistanceToNow } from "date-fns";
import "./NotificationBell.css";

const TYPE_ICONS = {
  assigned:         "📋",
  approved:         "✅",
  rejected:         "❌",
  overdue:          "⏰",
  review_requested: "👀",
};

export default function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const ref = useRef();

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleNotifClick(n) {
    await markRead(n.id);
    setOpen(false);
    if (n.taskId) navigate(`/tasks/${n.taskId}`);
  }

  return (
    <div className="notif-wrap" ref={ref}>
      <button className="notif-btn" onClick={() => setOpen(!open)}>
        <span className="notif-icon">🔔</span>
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notif-panel">
          <div className="notif-panel-header">
            <span className="notif-panel-title">Notifications</span>
            {unreadCount > 0 && (
              <button className="notif-mark-all" onClick={markAllRead}>
                Mark all read
              </button>
            )}
          </div>

          <div className="notif-list">
            {notifications.length === 0 ? (
              <div className="notif-empty">No notifications yet</div>
            ) : (
              notifications.slice(0, 20).map((n) => (
                <div
                  key={n.id}
                  className={`notif-item ${!n.read ? "notif-item--unread" : ""}`}
                  onClick={() => handleNotifClick(n)}
                >
                  <span className="notif-type-icon" style={{ fontSize: 16 }}>
                    {TYPE_ICONS[n.type] || "📌"}
                  </span>
                  <div className="notif-body">
                    <div className="notif-message">{n.message}</div>
                    <div className="notif-time">
                      {n.createdAt &&
                        formatDistanceToNow(
                          n.createdAt.toDate?.() || new Date(n.createdAt),
                          { addSuffix: true }
                        )}
                    </div>
                  </div>
                  {!n.read && <div className="notif-dot" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
