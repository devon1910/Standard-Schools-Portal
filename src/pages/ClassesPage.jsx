import React, { useState } from 'react';
import ClassCard from '../components/ClassCard';
import ClassForm from '../components/ClassForm';
import Modal from '../components/Modal';

// Optional: Import icons if you install react-icons
// import { FaPlus } from 'react-icons/fa';

const ClassesPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);

  const [selectedSession, setSelectedSession] = useState('2024/2025');
  const [selectedTerm, setSelectedTerm] = useState('1st');

  const [classes, setClasses] = useState([
    { id: 1, name: 'JSS1 A', classTeacher: 'Mr. John Doe' },
    { id: 2, name: 'JSS2 B', classTeacher: 'Mrs. Jane Smith' },
    { id: 3, name: 'SSS1 C', classTeacher: 'Mr. David Lee' },
  ]);

  const handleAddClassClick = () => {
    setEditingClass(null);
    setIsModalOpen(true);
  };

  const handleEditClass = (classData) => {
    setEditingClass(classData);
    setIsModalOpen(true);
  };

  const handleDeleteClass = (classId) => {
    if (window.confirm('Are you sure you want to delete this class?')) {
      setClasses(classes.filter(c => c.id !== classId));
      alert(`Delete class ${classId}`);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingClass(null);
  };

  const handleClassFormSubmit = (formData) => {
    if (editingClass) {
      setClasses(classes.map(cls => cls.id === editingClass.id ? { ...cls, ...formData } : cls));
    } else {
      setClasses([...classes, { id: classes.length + 1, ...formData }]);
    }
    closeModal();
    console.log('Class Form Submitted:', { ...formData, session: selectedSession, term: selectedTerm });
  };

  const availableSessions = ['2024/2025', '2023/2024', '2022/2023'];
  const availableTerms = ['1st', '2nd', '3rd'];

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-semibold text-gray-800">Classes</h2>
        <button
          onClick={handleAddClassClick}
          className="px-6 py-3 bg-primary-orange text-white font-medium rounded-lg shadow-md hover:bg-opacity-80 transition-colors cursor-pointer flex items-center justify-center space-x-2"
          title="Add New Class"
        >
          {/* <FaPlus className="inline-block" /> */}
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
              <option key={session} value={session}>{session}</option>
            ))}
          </select>
        </div>

        
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.map((cls) => (
          <ClassCard
            key={cls.id}
            classData={cls}
            onEdit={handleEditClass}
            onDelete={handleDeleteClass}
            selectedSession={selectedSession}
            selectedTerm={selectedTerm}
          />
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingClass ? 'Edit Class' : 'Add New Class'}>
        <ClassForm onSubmit={handleClassFormSubmit} initialData={editingClass} />
      </Modal>
    </div>
  );
};

export default ClassesPage;