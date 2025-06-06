import React, { useState } from 'react';
import ClassCard from '../components/ClassCard';
import ClassForm from '../components/ClassForm';
import Modal from '../components/Modal';
import { useDashboardData } from '../layouts/MainLayout';

// Optional: Import icons if you install react-icons
import { FaPlus } from 'react-icons/fa';
import { deleteClassesData, submitClassData } from '../services/StandardSchoolsAPIService';

const ClassesPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  
  const { dashboardData, isLoading} = useDashboardData();
  

  const [selectedSession, setSelectedSession] = useState('2024/2025');
  const [selectedTerm, setSelectedTerm] = useState('1st');

  const availableSessions = dashboardData.sessions;
  const classesData = dashboardData.classes;
  const classTypes = dashboardData.classTypes;
  
  // Filter classes by selected session
  const filteredClasses = classesData.filter(cls => {
    // Find the selected session object
    const selectedSessionObj = availableSessions.find(session => session.name === selectedSession);
    
    // Filter classes that belong to the selected session
    return cls.sessionId + 1 === selectedSessionObj?.id;
  });

  const handleAddClassClick = () => {
    setEditingClass(null);
    setIsModalOpen(true);
  };

   const handleEditClassClick = (classesData) => {
    setEditingClass(classesData)
    setIsModalOpen(true);
  };

  const handleDeleteClass = async (classId) => {
    if (window.confirm('Are you sure you want to delete this class?')) {
       await deleteClassesData(classId).then((response)=>{
        console.log('response: ', response);
        window.location.reload();
       })
    }

  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingClass(null);
  };

  const handleClassFormSubmit = async (formData) => {
    formData.sessionId = availableSessions.filter((session) => session.name === selectedSession)[0].id
    
    await submitClassData(formData).then((response)=>{
      console.log('response: ', response);
      window.location.reload();
    }).catch(error => console.log(error));
    
    closeModal();

  };

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
        <h2 className="text-3xl font-semibold text-gray-800">Classes</h2>
        <button
          onClick={handleAddClassClick}
          className="px-6 py-3 bg-primary-orange text-white font-medium rounded-lg shadow-md hover:bg-opacity-80 transition-colors cursor-pointer flex items-center justify-center space-x-2"
          title="Add New Class"
        >
          <FaPlus className="inline-block" />
          <span>Add New Class</span>
        </button>
      </div>

      {/* Session and Term Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <label htmlFor="session-filter" className="block text-sm font-medium text-gray-700 mb-1">
            Select Session
          </label>
          <select
            id="session-filter"
            name="session"
            value={selectedSession}
            onChange={(e) => setSelectedSession(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-orange focus:border-primary-orange sm:text-sm cursor-pointer"
          >
            {availableSessions.map(session => (
              <option key={session.id} value={session.name}>{session.name}</option>
            ))}
          </select>
        </div>

        
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClasses.length > 0 ? (
          filteredClasses.map((cls) => (
            <ClassCard
              key={cls.id}
              classData={cls}
              onEdit={handleEditClassClick}
              onDelete={handleDeleteClass}
              selectedSession={selectedSession}
              selectedTerm={selectedTerm}
            />
          ))
        ) : (
          <div className="col-span-full text-center py-8">
            <p className="text-gray-500 text-lg">No classes found for the selected session.</p>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingClass ? 'Edit Class' : 'Add New Class'}>
        <ClassForm 
        onSubmit={handleClassFormSubmit} 
        initialData={editingClass} 
        classTypes={classTypes}
        selectedSession={selectedSession} />
      </Modal>
    </div>
  );
};

export default ClassesPage;