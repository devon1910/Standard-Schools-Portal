import React, { useState } from 'react';
import Modal from '../components/Modal';
import Table from '../components/Table';
import { FaEdit, FaPlus, FaTrashAlt } from 'react-icons/fa';
import SubjectForm from '../components/SubjectForm';
import { useDashboardData } from '../layouts/MainLayout';
import { deleteSubjectData, submitSubjectData } from '../services/StandardSchoolsAPIService';

const SubjectsPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);

  const { dashboardData, isLoading, setIsLoading } = useDashboardData();

  const availableSubjects = dashboardData.subjects;

  const handleDeleteSubject = (subjectId) => {
    if (window.confirm('Are you sure you want to delete this subject?')) {
      setIsLoading(true);
      deleteSubjectData(subjectId)
        .then((response) => {
          console.log('response: ', response);
          window.location.reload();
        })
        .catch((error) => {
          console.error('Error deleting subject:', error);
          setIsLoading(false);
        });
    }
  };

  const tableHeaders = ['Subject Name', 'Class Type', 'Actions'];
  const tableRows = availableSubjects.map(subject => ({
    id: subject.id,
    data: [
      subject.name,
      dashboardData.classTypes.find(ct => ct.id === subject.classTypeId)?.name || 'N/A'
    ],
    actions: (
      <div className="flex space-x-2">
        <button
          onClick={() => { setEditingSubject(subject); setIsModalOpen(true); }}
          className="px-3 py-1 bg-primary-orange text-white rounded hover:bg-opacity-80 transition-colors cursor-pointer flex items-center justify-center space-x-1"
          title="Edit Subject"
        >
          <FaEdit />
          <span>Edit</span>
        </button>
        <button
          onClick={() => handleDeleteSubject(subject.id)}
          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors cursor-pointer flex items-center justify-center space-x-1"
          title="Delete Subject"
        >
          <FaTrashAlt />
          <span>Delete</span>
        </button>
      </div>
    )
  }));

  const handleAddSubjectClick = () => {
    setEditingSubject(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSubject(null);
  };

  const handleSubjectFormSubmit = (formData) => {
    setIsLoading(true);
    submitSubjectData(formData)
      .then((response) => {
        console.log('response: ', response);
        window.location.reload();
      })
      .catch((error) => {
        console.error('Error submitting subject:', error);
      })
      .finally(() => {
        closeModal();
      });
  };

  if (isLoading && !isModalOpen) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-primary-orange"></div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-semibold text-gray-800">Manage Subjects</h2>
        <button
          onClick={handleAddSubjectClick}
          className="px-6 py-3 bg-primary-orange text-white font-medium rounded-lg shadow-md hover:bg-opacity-80 transition-colors cursor-pointer flex items-center justify-center space-x-2"
          title="Create New Subject"
        >
          <FaPlus className="inline-block" />
          <span>Create New Subject</span>
        </button>
      </div>

      {availableSubjects.length > 0 ? (
        <div className="overflow-x-auto">
          <Table headers={tableHeaders} rows={tableRows} />
        </div>
      ) : (
        <p className="text-center text-gray-600 py-8">
          No subjects created yet. Click "Create New Subject" to add one.
        </p>
      )}

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingSubject ? 'Edit Subject' : 'Create New Subject'}>
        <SubjectForm onSubmit={handleSubjectFormSubmit} initialData={editingSubject} />
      </Modal>
    </div>
  );
};

export default SubjectsPage; 