import React, { useState } from 'react';
import Modal from '../components/Modal';
import Table from '../components/Table'; // Re-use the existing Table component

import { FaEdit, FaPlus, FaTrashAlt } from 'react-icons/fa';
import SessionForm from '../components/SessionsForm';

const SessionsPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState(null); // For future edit functionality

  // Dummy data for existing sessions (replace with backend data later)
  const [sessions, setSessions] = useState([
    { id: 1, name: '2024/2025' },
    { id: 2, name: '2023/2024' },
    { id: 3, name: '2022/2023' },
  ]);

  const tableHeaders = ['Session Name', 'Actions'];
  const tableRows = sessions.map(session => ({
    id: session.id,
    data: [session.name],
    actions: (
      <div className="flex space-x-2">
         <button
          onClick={() => { setEditingSession(session); setIsModalOpen(true); }}
          className="px-3 py-1 bg-primary-orange text-white rounded hover:bg-opacity-80 transition-colors cursor-pointer flex items-center justify-center space-x-1"
          title="Edit Session"
        >
          <FaEdit />
          <span>Edit</span>
        </button>
        <button
          onClick={() => alert(`Delete session ${session.name} (ID: ${session.id})`)}
          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors cursor-pointer flex items-center justify-center space-x-1"
          title="Delete Session"
        >
          <FaTrashAlt />
          <span>Delete</span>
        </button>
      </div>
    )
  }));


  const handleAddSessionClick = () => {
    setEditingSession(null); // Clear any previous editing state
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSession(null);
  };

  const handleSessionFormSubmit = (formData) => {
    console.log('Session Form Submitted:', formData);
    // In a real application, you'd send this to your backend API.
    // For UI, we'll just add it to our local dummy state.
    setSessions(prevSessions => [
      ...prevSessions,
      { id: prevSessions.length ? Math.max(...prevSessions.map(s => s.id)) + 1 : 1, name: formData.name }
    ].sort((a,b) => b.name.localeCompare(a.name))); // Sort descending by session name (e.g., 2024/2025 first)
    closeModal();
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-semibold text-gray-800">Manage Sessions</h2>
        <button
          onClick={handleAddSessionClick}
          className="px-6 py-3 bg-primary-orange text-white font-medium rounded-lg shadow-md hover:bg-opacity-80 transition-colors cursor-pointer flex items-center justify-center space-x-2"
          title="Create New Session"
        >
          <FaPlus className="inline-block" />
          <span>Create New Session</span>
        </button>
      </div>

      {sessions.length > 0 ? (
        <div className="overflow-x-auto">
          <Table headers={tableHeaders} rows={tableRows} />
        </div>
      ) : (
        <p className="text-center text-gray-600 py-8">
          No academic sessions created yet. Click "Create New Session" to add one.
        </p>
      )}


      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingSession ? 'Edit Session' : 'Create New Session'}>
        <SessionForm onSubmit={handleSessionFormSubmit} initialData={editingSession} />
      </Modal>
    </div>
  );
};

export default SessionsPage;