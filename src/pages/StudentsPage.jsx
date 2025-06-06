import React, { useState, useEffect, use } from 'react';
import { useParams, useSearchParams } from 'react-router-dom'; // To get classId and query params from URL
import StudentForm from '../components/StudentForm';
import Table from '../components/Table';
import Modal from '../components/Modal';

// Optional: You could import icons here if you install a library like react-icons
import { FaEdit, FaPlus, FaTrashAlt } from 'react-icons/fa'; // Example icons
import { getStudentsData, submitStudentData } from '../services/StandardSchoolsAPIService';
import { useDashboardData } from '../layouts/MainLayout';

const StudentsPage = () => {
  const { classId, sessionId } = useParams(); // Get classId from URL path
  const [searchParams] = useSearchParams(); // Get query parameters
  const selectedSession = searchParams.get('session') || 0; // Default or get from URL
  const selectedTerm = searchParams.get('term') || '1st'; // Default or get from URL

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [allStudents, setAllStudents] = useState([]);

  const { dashboardData, isLoading} = useDashboardData();

  const availableSessions = dashboardData.sessions;
  const terms = dashboardData.terms;


  useEffect(() => {
    getStudentsData(classId,selectedSession).then((response) => { 
      // Pass classId and sessionId to getStudentsData function 
      console.log('response: ', response);
      setAllStudents(response.data);

  }).catch((error) => {
    console.log(error);
  });
  }, [classId, selectedSession]);


  const tableHeaders = ['Name', 'Fee Status', 'Balance', 'Actions'];

  const tableRows = allStudents.map(s => ({
    id: s.id,
    data: [
      s.name,
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
     submitStudentData(formData).then((response) => {
       console.log('response: ', response);
       
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
        <h2 className="text-3xl font-semibold text-gray-800">
          Students in {classId}
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

      {allStudents.length > 0 ? (
        <div className="overflow-x-auto">
          <Table headers={tableHeaders} rows={tableRows} />
        </div>
      ) : (
        <p className="text-center text-gray-600 py-8">
          No students found for this class and specified session ({selectedSession}), and term ({selectedTerm}).
        </p>
      )}

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingStudent ? 'Edit Student' : 'Add New Student'}>
        <StudentForm
          onSubmit={handleStudentFormSubmit}
          terms={terms}
          classId={classId}
          sessions={availableSessions}
          initialData={editingStudent}
          defaultSession={selectedSession}
          defaultTerm={selectedTerm}
        />
      </Modal>
    </div>
  );
};

export default StudentsPage;