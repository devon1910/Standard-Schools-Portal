import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import QuestionsPage from './pages/QuestionsPage';
import ClassesPage from './pages/ClassesPage';
import StudentsPage from './pages/StudentsPage';
import SessionsPage from './pages/SessionsPage'; 

function App() {
  return (
    <Router>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/questions" replace />} />
          <Route path="/questions" element={<QuestionsPage />} />
          <Route path="/classes" element={<ClassesPage />} />
          <Route path="/classes/:classId/students" element={<StudentsPage />} />
          <Route path="/sessions" element={<SessionsPage />} /> 
          <Route path="*" element={<h1 className="text-center text-3xl font-bold">404 - Page Not Found</h1>} />
        </Routes>
      </MainLayout>
    </Router>
  );
}

export default App;