// src/pages/ReportsPage.js
import React, { useState, useEffect } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "../firebase/config";
import { useUser } from "../context/UserContext";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { ROLE_LABELS, STAGE_LABELS } from "../utils/constants";
import { differenceInHours } from "date-fns";
import "./ReportsPage.css";

const COLORS = ["#0e6ba8","#00c2cb","#22c55e","#eab308","#ef4444","#a855f7","#f97316","#14b8a6"];

export default function ReportsPage() {
  const { allUsers }          = useUser();
  const [tasks, setTasks]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onSnapshot(query(collection(db, "tasks")), (snap) => {
      setTasks(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, []);

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 80 }}><div className="spinner" style={{ width: 32, height: 32 }} /></div>;

  const usersMap = Object.fromEntries(allUsers.map((u) => [u.id, u]));
  const now      = new Date();

  // Completed per person
  const byPerson = {};
  tasks.filter((t) => ["delivered","ext_delivered"].includes(t.stage)).forEach((t) => {
    const name = usersMap[t.assignedTo]?.name || "Unassigned";
    byPerson[name] = (byPerson[name] || 0) + 1;
  });
  const completedData = Object.entries(byPerson).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10);

  // Status distribution
  const statusData = [
    { name: "In Progress",   value: tasks.filter((t) => t.stage?.includes("in_progress")).length },
    { name: "Under Review",  value: tasks.filter((t) => t.stage?.includes("review")).length },
    { name: "Pending",       value: tasks.filter((t) => ["initiated","ext_initiated"].includes(t.stage)).length },
    { name: "Delivered",     value: tasks.filter((t) => ["delivered","ext_delivered"].includes(t.stage)).length },
    { name: "Overdue",       value: tasks.filter((t) => t.dueDate && !["delivered","ext_delivered"].includes(t.stage) && new Date(t.dueDate.toDate?.() || t.dueDate) < now).length },
  ].filter((s) => s.value > 0);

  // Turnaround per stage
  const stageTotals = {}; const stageCounts = {};
  tasks.forEach((t) => {
    if (!t.history || t.history.length < 2) return;
    const sorted = [...t.history].sort((a, b) => new Date(a.timestamp?.toDate?.() || a.timestamp) - new Date(b.timestamp?.toDate?.() || b.timestamp));
    for (let i = 1; i < sorted.length; i++) {
      const label = STAGE_LABELS[sorted[i].stage] || sorted[i].stage;
      const hrs   = differenceInHours(new Date(sorted[i].timestamp?.toDate?.() || sorted[i].timestamp), new Date(sorted[i-1].timestamp?.toDate?.() || sorted[i-1].timestamp));
      if (hrs >= 0) { stageTotals[label] = (stageTotals[label] || 0) + hrs; stageCounts[label] = (stageCounts[label] || 0) + 1; }
    }
  });
  const turnaroundData = Object.entries(stageTotals).map(([stage, total]) => ({ stage, avgHours: Math.round(total / stageCounts[stage]) })).sort((a, b) => b.avgHours - a.avgHours).slice(0, 8);

  // Workload by team
  const byTeam = {};
  tasks.filter((t) => !["delivered","ext_delivered"].includes(t.stage)).forEach((t) => {
    const role = usersMap[t.assignedTo]?.role;
    const label = role ? (ROLE_LABELS[role]?.split(" ")[0] || role) : "Unassigned";
    byTeam[label] = (byTeam[label] || 0) + 1;
  });
  const workloadData = Object.entries(byTeam).map(([team, count]) => ({ team, count })).sort((a, b) => b.count - a.count);

  const total     = tasks.length;
  const delivered = tasks.filter((t) => ["delivered","ext_delivered"].includes(t.stage)).length;
  const rate      = total > 0 ? Math.round((delivered / total) * 100) : 0;
  const overdue   = tasks.filter((t) => t.dueDate && !["delivered","ext_delivered"].includes(t.stage) && new Date(t.dueDate.toDate?.() || t.dueDate) < now);

  return (
    <div className="reports-page fade-in">
      <div className="page-header">
        <div><h1 className="page-title">Reports & Analytics</h1><p className="page-subtitle">Team performance overview</p></div>
      </div>

      <div className="kpi-row">
        {[["Total Tasks", total], ["Delivered", delivered], ["Delivery Rate", rate + "%"], ["Overdue", overdue.length], ["Team Members", allUsers.filter((u) => u.role !== "admin").length]].map(([l, v]) => (
          <div key={l} className="kpi-card card"><div className="kpi-value">{v}</div><div className="kpi-label">{l}</div></div>
        ))}
      </div>

      <div className="charts-grid">
        <div className="card chart-card">
          <div className="chart-title">Tasks completed per person</div>
          {completedData.length === 0 ? <div className="empty-state" style={{ padding: "24px 0" }}><div className="empty-state-text">No completed tasks yet</div></div> : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={completedData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#0e6ba8" radius={[4,4,0,0]} name="Completed" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card chart-card">
          <div className="chart-title">Task status distribution</div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="42%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card chart-card">
          <div className="chart-title">Avg. turnaround by stage (hours)</div>
          {turnaroundData.length === 0 ? <div className="empty-state" style={{ padding: "24px 0" }}><div className="empty-state-text">Not enough data yet</div></div> : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={turnaroundData} layout="vertical" margin={{ top: 8, right: 20, left: 90, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="stage" type="category" tick={{ fontSize: 11 }} width={90} />
                <Tooltip />
                <Bar dataKey="avgHours" fill="#00c2cb" radius={[0,4,4,0]} name="Avg Hours" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card chart-card">
          <div className="chart-title">Active workload by team</div>
          {workloadData.length === 0 ? <div className="empty-state" style={{ padding: "24px 0" }}><div className="empty-state-text">No active tasks</div></div> : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={workloadData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
                <XAxis dataKey="team" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#a855f7" radius={[4,4,0,0]} name="Active Tasks" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {overdue.length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--gray-100)" }}>
            <h3 className="section-title" style={{ color: "var(--red-700)" }}>⚠ Overdue Tasks ({overdue.length})</h3>
          </div>
          <table className="overdue-table">
            <thead><tr><th>Task</th><th>Assigned to</th><th>Due date</th><th>Stage</th></tr></thead>
            <tbody>
              {overdue.map((t) => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 500 }}>{t.title}</td>
                  <td style={{ color: "var(--gray-500)" }}>{usersMap[t.assignedTo]?.name || "—"}</td>
                  <td style={{ color: "var(--red-700)" }}>{t.dueDate && new Date(t.dueDate.toDate?.() || t.dueDate).toLocaleDateString()}</td>
                  <td><span className="badge" style={{ background: "var(--red-50)", color: "var(--red-700)" }}>{STAGE_LABELS[t.stage]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
