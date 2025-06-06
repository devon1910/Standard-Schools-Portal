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
  
  const { dashboardData} = useDashboardData();

  console.log("dashboardData: ",dashboardData);

  

  const [selectedSession, setSelectedSession] = useState('2024/2025');
  const [selectedTerm, setSelectedTerm] = useState('1st');

  const availableSessions =dashboardData.sessions;
  const classesData= dashboardData.classes;

  const classTypes= dashboardData.classTypes
  

  const handleAddClassClick = () => {
    setEditingClass(null);
    setIsModalOpen(true);
  };

  const handleDeleteClass = async (classId) => {
    if (window.confirm('Are you sure you want to delete this class?')) {
       await deleteClassesData(classId).then((response)=>{
        console.log('delete response: ', response);
       })
    }

  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingClass(null);
  };

  const handleClassFormSubmit = async (formData) => {
    console.log('formData: ', formData);
    await submitClassData(formData).then((response)=>{
      console.log('response: ', response);
    }).catch(error => console.log(error));
    
    closeModal();
    console.log('Class Form Submitted:', { ...formData, session: selectedSession, term: selectedTerm });
  };
  
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
              <option key={session.id} value={session.id}>{session.name}</option>
            ))}
          </select>
        </div>

        
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classesData.map((cls) => (
          <ClassCard
            key={cls.id}
            classData = {cls}
            onEdit={handleClassFormSubmit}
            onDelete={handleDeleteClass}
            selectedSession={selectedSession}
            selectedTerm={selectedTerm}
          />
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingClass ? 'Edit Class' : 'Add New Class'}>
        <ClassForm onSubmit={handleClassFormSubmit} initialData={editingClass} classTypes={classTypes} />
      </Modal>
    </div>
  );
};

export default ClassesPage;