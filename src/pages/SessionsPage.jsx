import React, { useEffect, useState } from 'react';
import Modal from '../components/Modal';
import Table from '../components/Table'; // Re-use the existing Table component

import { FaEdit, FaPlus, FaTrashAlt } from 'react-icons/fa';
import SessionForm from '../components/SessionsForm';
import { useDashboardData } from '../layouts/MainLayout';
import { deleteSessionData, submitSessionData } from '../services/StandardSchoolsAPIService';

const SessionsPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState(null); // For future edit functionality

  const { dashboardData, isLoading, setIsLoading} = useDashboardData();

  const availableSessions = dashboardData.sessions;

  const tableHeaders = ['Session Name', 'Actions'];
  const tableRows = availableSessions.map(session => ({
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
          onClick={() => handleDeleteSession(session.id)}
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
    setIsLoading(true);
   submitSessionData(formData).then((response) => {
     console.log('response: ', response);
     window.location.reload();
   }).catch((error) => {
     console.error('Error submitting session:', error);
   }).finally(() => {
     closeModal();
   })

    
  };

  const handleDeleteSession = (sessionId) => {
    if (window.confirm('Are you sure you want to delete this session?')) {
      setIsLoading(true);
      deleteSessionData(sessionId).then((response) => {
      console.log('response: ', response);
      window.location.reload();
    })
    }
   
  }
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-primary-orange"></div>
      </div>
    );
  }

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

      {availableSessions.length > 0 ? (
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