import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import MainLayout from "./layouts/MainLayout";
import QuestionsPage from "./pages/QuestionsPage";
import ClassesPage from "./pages/ClassesPage";
import StudentsPage from "./pages/StudentsPage";
import SessionsPage from "./pages/SessionsPage";
import SubjectsPage from "./pages/SubjectsPage";
import AllStudentsPage from "./pages/AllStudentsPage";
import DashboardPage from "./pages/DashboardPage";
import Login from "./pages/Login";
import "./App.css";


function App() {
  return (
    <Router>
      <ToastContainer
        position="top-center"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      <Routes>
        {/* Public routes - no MainLayout */}
        <Route path="/login" element={<Login />} />

        {/* Protected routes with MainLayout */}
        <Route
          path="/"
          element={
            <MainLayout>
              <Navigate to="/dashboard" replace />
            </MainLayout>
          }
        />
        <Route
          path="/dashboard"
          element={
            <MainLayout>
              <DashboardPage />
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
          path="/students" 
          element={
            <MainLayout>
              <StudentsPage />
            </MainLayout>
          }
        />
        <Route
          path="/all-students"
          element={
            <MainLayout>
              <AllStudentsPage />
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
        <Route
          path="/subjects"
          element={
            <MainLayout>
              <SubjectsPage />
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
