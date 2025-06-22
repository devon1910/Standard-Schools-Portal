import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import StudentForm from '../components/StudentForm';
import Table from '../components/Table';
import Modal from '../components/Modal';
import { toast } from 'react-toastify';
import { FaEdit, FaPlus, FaTrashAlt } from 'react-icons/fa';
import { deleteStudentData, getStudentsData, submitStudentData } from '../services/StandardSchoolsAPIService';
import { useDashboardData } from '../layouts/MainLayout';

const StudentsPage = () => {
  const [searchParams] = useSearchParams();
  const selectedSession = searchParams.get('session') || '';
  const selectedClass = searchParams.get('class') || '';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [allStudents, setAllStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [selectedTermId, setSelectedTermId] = useState('');
  const [feeStatusFilter, setFeeStatusFilter] = useState('all'); // 'all', 'paid', 'unpaid'

  const { dashboardData } = useDashboardData();
  const { terms, classes, sessions } = dashboardData;

  const sessionId = sessions.find(session => session.name === selectedSession)?.id || '';
  const classId = classes.find(cls => cls.name === selectedClass)?.id || '';

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (sessionId && classId) {
      handleStudentDataRetrieval();
    }
  }, [sessionId, classId]);

  useEffect(() => {
    if (terms.length > 0 && !selectedTermId) {
      setSelectedTermId(terms[0].id);
    }
  }, [terms]);

  useEffect(() => {
    let students = [...allStudents];
    const term = terms.find(t => t.id.toString() === selectedTermId.toString());

    if (term && feeStatusFilter !== 'all') {
      const termName = term.name.split(' ')[0]; // "First" from "First Term"
      const feePaidKey = `is${termName}TermFeePaid`;

      students = students.filter(student => {
        const isPaid = student[feePaidKey.charAt(0).toLowerCase() + feePaidKey.slice(1)];
        return feeStatusFilter === 'paid' ? isPaid : !isPaid;
      });
    }
    setFilteredStudents(students);
  }, [allStudents, selectedTermId, feeStatusFilter, terms]);

  const handleStudentDataRetrieval = async () => {
    setIsLoading(true);
    getStudentsData(sessionId, classId)
      .then((response) => {
        setAllStudents(response.data);
      })
      .catch((error) => {
        console.error('Error fetching students:', error);
      }).finally(() => {
        setIsLoading(false);
      });
  };

  const selectedTerm = terms.find(t => t.id.toString() === selectedTermId.toString());
  const termPrefix = selectedTerm ? selectedTerm.name.split(' ')[0] : '';
  const isFeePaidKey = selectedTerm ? `is${termPrefix}TermFeePaid` : 'isFirstTermFeePaid';
  const balanceKey = selectedTerm ? `${termPrefix.toLowerCase()}TermBalance` : 'firstTermBalance';

  const tableHeaders = ['Name', 'Fee Status', 'Balance', 'Actions'];

  const tableRows = filteredStudents.map(s => {
    const isPaid = s[isFeePaidKey.charAt(0).toLowerCase() + isFeePaidKey.slice(1)];
    const balance = s[balanceKey];

    return {
      id: s.id,
      data: [
        s.name,
        <span
          key={`fee-status-${s.id}`}
          className={`px-2 py-1 rounded-full text-xs font-semibold ${
            isPaid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {isPaid ? 'Paid' : 'Unpaid'}
        </span>,
        `₦${(balance || 0).toLocaleString()}`,
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
            onClick={() => handleDeleteStudent(s.id)}
            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors cursor-pointer flex items-center justify-center space-x-1"
            title="Delete Student"
          >
            <FaTrashAlt className="inline-block mr-1" />
            <span>Delete</span>
          </button>
        </div>
      )
    };
  });

  const handleAddStudentClick = () => {
    setEditingStudent(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingStudent(null);
  };

  const handleDeleteStudent = async (studentId) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      try {
        await deleteStudentData(studentId);
        toast.success('Student deleted successfully');
        handleStudentDataRetrieval();
      } catch (error) {
        toast.error('Failed to delete student');
        console.error('Error deleting student:', error);
      }
    }
  };

  const handleSubmitStudent = async (formData) => {
    try {
      setIsLoading(true);
      formData.sessionId = sessionId;
      await submitStudentData(formData);
      toast.success(editingStudent ? 'Student updated successfully' : 'Student added successfully');
    } catch (error) {
      toast.error(editingStudent ? 'Failed to update student' : 'Failed to add student');
      console.error('Error submitting student:', error);
    } finally {
      handleStudentDataRetrieval();
      closeModal();
    }
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
        <div>
          <h2 className="text-3xl font-semibold text-gray-800">
            Students in {selectedClass}
            <span className="text-xl font-normal text-gray-600 block mt-1">
              Session: {selectedSession}
            </span>
          </h2>
        </div>
        <button
          onClick={handleAddStudentClick}
          className="px-6 py-3 bg-primary-orange text-white font-medium rounded-lg shadow-md hover:bg-opacity-80 transition-colors cursor-pointer"
        >
          <FaPlus className="inline-block mr-2" />Add New Student
        </button>
      </div>

      <div className="flex items-center space-x-4 mb-4">
        <div>
          <label htmlFor="term-filter" className="block text-sm font-medium text-gray-700">Filter by Term</label>
          <select
            id="term-filter"
            value={selectedTermId}
            onChange={(e) => setSelectedTermId(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-orange focus:border-primary-orange sm:text-sm rounded-md"
          >
            {terms.map(term => (
              <option key={term.id} value={term.id}>{term.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="fee-status-filter" className="block text-sm font-medium text-gray-700">Fee Status</label>
          <select
            id="fee-status-filter"
            value={feeStatusFilter}
            onChange={(e) => setFeeStatusFilter(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-orange focus:border-primary-orange sm:text-sm rounded-md"
          >
            <option value="all">All</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
          </select>
        </div>
      </div>

      {filteredStudents.length > 0 ? (
        <div className="overflow-x-auto">
          <Table headers={tableHeaders} rows={tableRows} />
        </div>
      ) : (
        <p className="text-center text-gray-600 py-8">
          No students found for the selected criteria.
        </p>
      )}

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingStudent ? 'Edit Student' : 'Add New Student'}>
        <StudentForm
          onSubmit={handleSubmitStudent}
          classId={classId}
          selectedSession={selectedSession}
          initialData={editingStudent}
          defaultSession={selectedSession}
        />
      </Modal>
    </div>
  );
};

export default StudentsPage;