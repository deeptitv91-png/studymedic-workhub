// src/hooks/useDueDateReminders.js
//
// Runs on mount for the current user.
// Checks all tasks assigned to them that are due within 24 hours or overdue.
// Sends a notification if one hasn't been sent already today.

import { useEffect } from "react";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";
import { useUser } from "../context/UserContext";
import { differenceInHours, startOfDay } from "date-fns";

export function useDueDateReminders() {
  const { currentUser } = useUser();

  useEffect(() => {
    if (!currentUser?.id) return;

    async function checkDueDates() {
      const now = new Date();

      // Get tasks assigned to this user that aren't delivered
      const q = query(
        collection(db, "tasks"),
        where("assignedTo", "==", currentUser.id)
      );
      const snap = await getDocs(q);
      const tasks = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      const activeTasks = tasks.filter(
        (t) => !["delivered", "ext_delivered"].includes(t.stage) && t.dueDate
      );

      for (const task of activeTasks) {
        const due = task.dueDate.toDate?.() || new Date(task.dueDate);
        const hoursUntilDue = differenceInHours(due, now);

        let message = null;
        let type = "overdue";

        if (hoursUntilDue < 0) {
          message = `⏰ Overdue: "${task.title}" was due ${Math.abs(Math.round(hoursUntilDue))} hours ago.`;
        } else if (hoursUntilDue <= 24) {
          message = `⏰ Due soon: "${task.title}" is due in ${Math.round(hoursUntilDue)} hours.`;
          type = "overdue";
        } else {
          continue;
        }

        // Check if we already sent a reminder today
        const todayStart = startOfDay(now).toISOString();
        const existingQ = query(
          collection(db, "notifications"),
          where("userId", "==", currentUser.id),
          where("taskId", "==", task.id),
          where("type", "==", "overdue")
        );
        const existing = await getDocs(existingQ);
        const alreadySentToday = existing.docs.some((d) => {
          const createdAt = d.data().createdAt?.toDate?.();
          return createdAt && createdAt >= new Date(todayStart);
        });

        if (!alreadySentToday) {
          await addDoc(collection(db, "notifications"), {
            userId: currentUser.id,
            type,
            message,
            taskId: task.id,
            taskTitle: task.title,
            read: false,
            createdAt: serverTimestamp(),
            fromName: "System",
          });
        }
      }
    }

    checkDueDates();
    // Re-check every hour
    const interval = setInterval(checkDueDates, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [currentUser?.id]);
}
