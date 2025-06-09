import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import QuestionsPage from "./pages/QuestionsPage";
import ClassesPage from "./pages/ClassesPage";
import StudentsPage from "./pages/StudentsPage";
import SessionsPage from "./pages/SessionsPage";
import Login from "./pages/Login";
import "./App.css";

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes - no MainLayout */}
        <Route path="/login" element={<Login />} />

        {/* Protected routes with MainLayout */}
        <Route
          path="/"
          element={
            <MainLayout>
              <Navigate to="/login" replace />
            </MainLayout>
          }
        />
        <Route
          path="/questions"
          element={
            <MainLayout>
              <QuestionsPage />
            </MainLayout>
          }
        />
        <Route
          path="/classes"
          element={
            <MainLayout>
              <ClassesPage />
            </MainLayout>
          }
        />
        <Route
          path="/classes/:classId/students"
          element={
            <MainLayout>
              <StudentsPage />
            </MainLayout>
          }
        />
        <Route
          path="/sessions"
          element={
            <MainLayout>
              <SessionsPage />
            </MainLayout>
          }
        />

        {/* 404 route - you can choose whether to use MainLayout or not */}
        <Route
          path="*"
          element={
            <h1 className="text-center text-3xl font-bold">
              404 - Page Not Found
            </h1>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
