// src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { UserProvider, useUser } from "./context/UserContext";
import { NotificationProvider } from "./context/NotificationContext";
import Layout from "./components/layout/Layout";
import UserSelectPage from "./pages/UserSelectPage";
import DashboardPage from "./pages/DashboardPage";
import TaskDetailPage from "./pages/TaskDetailPage";
import MyTasksPage from "./pages/MyTasksPage";
import DocumentsPage from "./pages/DocumentsPage";
import ReportsPage from "./pages/ReportsPage";
import AdminPage from "./pages/AdminPage";
import "./styles/global.css";

function AppRoutes() {
  const { currentUser, loadingUsers } = useUser();

  if (loadingUsers) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <div className="spinner" style={{ width: 36, height: 36 }} />
      </div>
    );
  }

  if (!currentUser) return <UserSelectPage />;

  return (
    <NotificationProvider>
      <Layout>
        <Routes>
          <Route path="/"              element={<DashboardPage />} />
          <Route path="/my-tasks"      element={<MyTasksPage />} />
          <Route path="/tasks/:taskId" element={<TaskDetailPage />} />
          <Route path="/documents"     element={<DocumentsPage />} />
          <Route path="/reports"       element={<ReportsPage />} />
          <Route path="/admin"         element={<AdminPage />} />
          <Route path="*"              element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </NotificationProvider>
  );
}

export default function App() {
  return (
    <UserProvider>
      <Router>
        <AppRoutes />
      </Router>
    </UserProvider>
  );
}
