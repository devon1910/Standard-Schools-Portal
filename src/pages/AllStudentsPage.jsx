import React, { useEffect, useMemo, useState } from 'react';
import { getAllStudents, submitStudentData } from '../services/StandardSchoolsAPIService';
import Table from '../components/Table';
import Modal from '../components/Modal';
import StudentForm from '../components/StudentForm';
import { useDashboardData } from '../layouts/MainLayout';
import { toast } from 'react-toastify';
import { FaPlus } from 'react-icons/fa';

const PAGE_SIZE = 10;

const AllStudentsPage = () => {
  const [students, setStudents] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Dropdown states for creating a student
  const { dashboardData } = useDashboardData();
  const { sessions = [], classes = [], terms = [] } = dashboardData || {};
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedTermId, setSelectedTermId] = useState('');

  // Debounced search value
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const fetchStudents = async () => {
      setIsLoading(true);
      try {
        const resp = await getAllStudents({ page, pageSize: PAGE_SIZE, search: debouncedSearch });
        const data = resp.data || {};
        const items =  data.studentRecords || [];
        setStudents(items);
        setTotalRecords(data.totalRecords || data.total || items.length || 0);
      } catch (e) {
        console.error('Failed to fetch all students', e);
        setStudents([]);
        setTotalRecords(0);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStudents();
  }, [page, debouncedSearch]);

  // Initialize default dropdown selections when options load
  useEffect(() => {
    if (sessions.length && !selectedSessionId) setSelectedSessionId(sessions[0].id);
    if (classes.length && !selectedClassId) setSelectedClassId(classes[0].id);
    if (terms.length && !selectedTermId) setSelectedTermId(terms[0].id);
  }, [sessions, classes, terms, selectedSessionId, selectedClassId, selectedTermId]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalRecords / PAGE_SIZE)), [totalRecords]);

  const headers = useMemo(() => [
    'Admission No',
    'Name',
    'Class',
    'Gender',
    'Actions'
  ], []);

  const rows = useMemo(() => students.map((s) => ({
    id: s.id || s.admissionNumber || `${s.name}-${s.className}`,
    data: [
      s.admissionNumber || '—',
      s.name || '—',
      s.className || s.class || '—',
      s.gender || '—',
    ],
    actions: (
      <button
        onClick={() => setSelectedStudent(s)}
        className="text-blue-600 hover:text-blue-800 cursor-pointer "
      >
        View
      </button>
    )
  })), [students]);

  const goToPage = (p) => {
    const clamped = Math.max(1, Math.min(totalPages, p));
    setPage(clamped);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-semibold">All Students</h2>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by student name..."
            className="w-full sm:w-72 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-orange focus:border-primary-orange"
          />
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-primary-orange text-white rounded-md shadow hover:bg-opacity-80 transition-colors cursor-pointer flex items-center gap-2"
          >
            <FaPlus />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      <div>
        {isLoading ? (
          <div className="text-center text-gray-600 py-10">Loading...</div>
        ) : (
          <Table headers={headers} rows={rows} />
        )}
      </div>

      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-gray-600">
          Page {page} of {totalPages} • {totalRecords} total
        </p>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-2 border rounded cursor-pointer disabled:opacity-50"
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1}
          >
            Previous
          </button>
          <button
            className="px-3 py-2 border rounded cursor-pointer disabled:opacity-50"
            onClick={() => goToPage(page + 1)}
            disabled={page >= totalPages}
          >
            Next
          </button>
        </div>
      </div>

      <Modal
        isOpen={!!selectedStudent}
        onClose={() => setSelectedStudent(null)}
        title={selectedStudent ? selectedStudent.name : 'Student'}
      >
        {selectedStudent && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="text-gray-500">Admission No</div>
                <div className="font-medium">{selectedStudent.admissionNumber || '—'}</div>
              </div>
              <div>
                <div className="text-gray-500">Class</div>
                <div className="font-medium">{selectedStudent.className || selectedStudent.class || '—'}</div>
              </div>
              <div>
                <div className="text-gray-500">Gender</div>
                <div className="font-medium">{selectedStudent.gender || '—'}</div>
              </div>
              <div>
                <div className="text-gray-500">Date of Birth</div>
                <div className="font-medium">{selectedStudent.dob || '—'}</div>
              </div>
              <div>
                <div className="text-gray-500">Parent Name</div>
                <div className="font-medium">{selectedStudent.parentName || '—'}</div>
              </div>
              <div>
                <div className="text-gray-500">Parent Phone</div>
                <div className="font-medium">{selectedStudent.parentPhone || '—'}</div>
              </div>
              <div>
                <div className="text-gray-500">Address</div>
                <div className="font-medium">{selectedStudent.parentAddress || '—'}</div>
              </div>
              <div>
                <div className="text-gray-500">Religion</div>
                <div className="font-medium">{selectedStudent.parentReligion || '—'}</div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Student Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Student"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Session</label>
              <select
                className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-orange focus:border-primary-orange sm:text-sm"
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
              >
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
              <select
                className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-orange focus:border-primary-orange sm:text-sm"
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Term</label>
              <select
                className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-orange focus:border-primary-orange sm:text-sm"
                value={selectedTermId}
                onChange={(e) => setSelectedTermId(e.target.value)}
              >
                {terms.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          <StudentForm
            onSubmit={async (formData) => {
              try {
                setIsLoading(true);
                formData.sessionId = selectedSessionId;
                formData.classId = selectedClassId;
                formData.selectedTermId = selectedTermId;
                await submitStudentData(formData);
                toast.success('Student added successfully');
                // Refresh list
                const resp = await getAllStudents({ page, pageSize: PAGE_SIZE, search: debouncedSearch });
                const data = resp.data || {};
                const items = data.studentRecords || [];
                setStudents(items);
                setTotalRecords(data.totalRecords || data.total || items.length || 0);
                setIsAddModalOpen(false);
              } catch (error) {
                console.error('Error submitting student:', error);
                toast.error('Failed to add student');
              } finally {
                setIsLoading(false);
              }
            }}
            classId={selectedClassId}
            selectedSession={(sessions.find((s) => s.id.toString() === selectedSessionId.toString()) || {}).name || ''}
            initialData={null}
            selectedTermId={selectedTermId}
            selectedTermName={(terms.find((t) => t.id.toString() === selectedTermId.toString()) || {}).name || ''}
          />
        </div>
      </Modal>
    </div>
  );
};

export default AllStudentsPage;


