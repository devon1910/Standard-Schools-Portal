import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom'; // To get classId and query params from URL
import StudentForm from '../components/StudentForm';
import Table from '../components/Table';
import Modal from '../components/Modal';

// Optional: You could import icons here if you install a library like react-icons
import { FaEdit, FaPlus, FaTrashAlt } from 'react-icons/fa'; // Example icons

const StudentsPage = () => {
  const { classId } = useParams(); // Get classId from URL path
  const [searchParams] = useSearchParams(); // Get query parameters
  const selectedSession = searchParams.get('session') || '2024/2025'; // Default or get from URL
  const selectedTerm = searchParams.get('term') || '1st'; // Default or get from URL

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);

  // Dummy student data, now including feePaid and balance
  const allStudents = [
    { id: 101, classId: 1, name: 'Alice Johnson', admissionNumber: 'SN001', term: '1st', session: '2024/2025', feePaid: true, balance: 0 },
    { id: 102, classId: 1, name: 'Bob Williams', admissionNumber: 'SN002', term: '1st', session: '2024/2025', feePaid: false, balance: 50000 },
    { id: 103, classId: 1, name: 'Carol White', admissionNumber: 'SN003', term: '2nd', session: '2024/2025', feePaid: true, balance: 0 },
    { id: 201, classId: 2, name: 'Charlie Davis', admissionNumber: 'SN004', term: '2nd', session: '2024/2025', feePaid: false, balance: 25000 },
    { id: 202, classId: 2, name: 'Diana Prince', admissionNumber: 'SN005', term: '1st', session: '2023/2024', feePaid: true, balance: 0 },
    { id: 301, classId: 3, name: 'Eve Adams', admissionNumber: 'SN006', term: '1st', session: '2024/2025', feePaid: false, balance: 75000 },
  ];

  const filteredStudents = allStudents.filter(
    s => s.classId === parseInt(classId) && s.session === selectedSession && s.term === selectedTerm
  );

  // Dummy class info (ensure it matches IDs in allStudents data)
  const classData = {
    id: classId,
    name: classId === '1' ? 'JSS1 A' : (classId === '2' ? 'JSS2 B' : (classId === '3' ? 'SSS1 C' : 'Unknown Class'))
  };

  const tableHeaders = ['Name', 'Admission No.', 'Fee Status', 'Balance', 'Actions'];

  const tableRows = filteredStudents.map(s => ({
    id: s.id,
    data: [
      s.name,
      s.admissionNumber,
      // Conditional styling for Fee Status
      <span
        key={`fee-status-${s.id}`}
        className={`px-2 py-1 rounded-full text-xs font-semibold ${
          s.feePaid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}
      >
        {s.feePaid ? 'Paid' : 'Unpaid'}
      </span>,
      `₦${s.balance.toLocaleString()}`, // Format balance as Nigerian Naira
    ],
    actions: (
      <div className="flex space-x-2">
        <button
          onClick={() => { setEditingStudent(s); setIsModalOpen(true); }}
          className="px-3 py-1 bg-primary-orange text-white rounded hover:bg-opacity-80 transition-colors cursor-pointer flex items-center justify-center space-x-1"
          title="Edit Student"
        >
          <FaEdit className="inline-block mr-1" /> 
          <span>Edit</span>
        </button>
        <button
          onClick={() => alert(`Delete student ${s.name} (ID: ${s.id})`)} // Replace with actual delete logic
          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors cursor-pointer flex items-center justify-center space-x-1"
          title="Delete Student"
        >
          <FaTrashAlt className="inline-block mr-1" /> 
          <span>Delete</span>
        </button>
      </div>
    )
  }));

  const handleAddStudentClick = () => {
    setEditingStudent(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingStudent(null);
  };

  const handleStudentFormSubmit = (formData) => {
    console.log('Student Form Submitted:', { ...formData, classId: parseInt(classId), session: selectedSession, term: selectedTerm });
    // In a real app, you'd send this to your backend and then refetch/update your local state.
    // For this UI, we just log it.
    closeModal();
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-semibold text-gray-800">
          Students in {classData.name}
          <span className="text-xl font-normal text-gray-600 block mt-1">
            Session: {selectedSession}, Term: {selectedTerm}
          </span>
        </h2>
        <button
          onClick={handleAddStudentClick}
          className="px-6 py-3 bg-primary-orange text-white font-medium rounded-lg shadow-md hover:bg-opacity-80 transition-colors cursor-pointer"
        >
          <FaPlus className="inline-block mr-2" />Add New Student
        </button>
      </div>

      {filteredStudents.length > 0 ? (
        <div className="overflow-x-auto">
          <Table headers={tableHeaders} rows={tableRows} />
        </div>
      ) : (
        <p className="text-center text-gray-600 py-8">
          No students found for this class ({classData.name}), session ({selectedSession}), and term ({selectedTerm}).
        </p>
      )}

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingStudent ? 'Edit Student' : 'Add New Student'}>
        <StudentForm
          onSubmit={handleStudentFormSubmit}
          initialData={editingStudent}
          defaultSession={selectedSession}
          defaultTerm={selectedTerm}
        />
      </Modal>
    </div>
  );
};

export default StudentsPage;