// src/context/NotificationContext.js
//
// Notifications are stored in Firestore under /notifications/{userId}/items/{notifId}
// Each notification targets a specific user by ID.
// Triggers: task assignment, approval, rejection, due-date reminders.

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  collection, query, onSnapshot, orderBy,
  doc, updateDoc, addDoc, serverTimestamp, where, writeBatch,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useUser } from "./UserContext";

const NotificationContext = createContext();

export function useNotifications() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }) {
  const { currentUser, allUsers } = useUser();
  const [notifications, setNotifications] = useState([]);

  // Load notifications for current user
  useEffect(() => {
    if (!currentUser?.id) { setNotifications([]); return; }
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", currentUser.id),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [currentUser?.id]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Mark a single notification as read
  async function markRead(notifId) {
    await updateDoc(doc(db, "notifications", notifId), { read: true });
  }

  // Mark all notifications as read
  async function markAllRead() {
    const unread = notifications.filter((n) => !n.read);
    if (!unread.length) return;
    const batch = writeBatch(db);
    unread.forEach((n) => batch.update(doc(db, "notifications", n.id), { read: true }));
    await batch.commit();
  }

  // Send a notification to a specific user
  async function sendNotification({ userId, type, message, taskId, taskTitle }) {
    if (!userId || userId === currentUser?.id) return; // don't notify yourself
    await addDoc(collection(db, "notifications"), {
      userId,
      type,      // "assigned" | "approved" | "rejected" | "overdue" | "review_requested"
      message,
      taskId,
      taskTitle,
      read: false,
      createdAt: serverTimestamp(),
      fromName: currentUser?.name || "System",
    });
  }

  // Send notification to all users with a given role
  async function notifyByRole(role, payload) {
    const targets = allUsers.filter((u) => u.role === role && u.id !== currentUser?.id);
    for (const u of targets) {
      await sendNotification({ userId: u.id, ...payload });
    }
  }

  // Called by workflow after auto-routing
  async function notifyAutoRoute({ task, newStage, fromName }) {
    const routingMessages = {
      design_assigned: {
        roles: ["design_lead"],
        message: `Content approved — "${task.title}" has been routed to your design queue.`,
        type: "assigned",
      },
      video_assigned: {
        roles: ["video_lead"],
        message: `Content approved — "${task.title}" has been routed to your video queue.`,
        type: "assigned",
      },
      creative_review: {
        roles: ["creative_head"],
        message: `Design/video approved — "${task.title}" is ready for your final review.`,
        type: "review_requested",
      },
      delivered: {
        userId: task.createdBy,
        message: `"${task.title}" has been approved and delivered!`,
        type: "approved",
      },
      ext_delivered: {
        userId: task.createdBy,
        message: `"${task.title}" has been approved and marked as delivered.`,
        type: "approved",
      },
    };

    const config = routingMessages[newStage];
    if (!config) return;

    if (config.roles) {
      for (const role of config.roles) {
        await notifyByRole(role, {
          message: config.message,
          type: config.type,
          taskId: task.id,
          taskTitle: task.title,
        });
      }
    } else if (config.userId) {
      await sendNotification({
        userId: config.userId,
        message: config.message,
        type: config.type,
        taskId: task.id,
        taskTitle: task.title,
      });
    }
  }

  const value = {
    notifications,
    unreadCount,
    markRead,
    markAllRead,
    sendNotification,
    notifyByRole,
    notifyAutoRoute,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
