import React, { useState, useEffect } from 'react';
import { useDashboardData } from '../layouts/MainLayout';

const StudentForm = ({ onSubmit, classId, selectedSession, initialData }) => {
  const [formData, setFormData] = useState({
    name: '',
    id: 0,
    classId: classId,
    sessionId: selectedSession,
  });
  const [selectedTermId, setSelectedTermId] = useState('');
  const [termBalance, setTermBalance] = useState(0);

  const { dashboardData } = useDashboardData();
  const { terms } = dashboardData;

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData(prev => ({
        ...prev,
        name: '',
        id: 0,
        classId: classId,
        sessionId: selectedSession,
      }));
    }
    // Set initial term and balance
    if (terms.length > 0) {
        const initialTermId = terms[0].id;
        setSelectedTermId(initialTermId);
        if (initialData) {
            updateTermBalance(initialTermId, initialData);
        } else {
            setTermBalance(0);
        }
    }
  }, [initialData, classId, selectedSession, terms]);

  useEffect(() => {
    if (initialData) {
        updateTermBalance(selectedTermId, initialData);
    }
  }, [selectedTermId, initialData]);

  const updateTermBalance = (termId, studentData) => {
    const term = terms.find(t => t.id.toString() === termId.toString());
    if (term && studentData) {
        const prefix = term.name.split(" ")[0].toLowerCase();
        const balanceKey = `${prefix}TermBalance`;
        setTermBalance(studentData[balanceKey] || 0);
    }
  };

  const handleTermChange = (e) => {
    setSelectedTermId(e.target.value);
  };
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // We only submit general student data, not term-specific balances from this form.
    const { name, id, classId: studentClassId, sessionId: studentSessionId } = formData;
    onSubmit({ name, id, classId: studentClassId, sessionId: studentSessionId });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-4">
      <div>
        <label htmlFor="studentName" className="block text-sm font-medium text-gray-700 mb-1">
          Student Name
        </label>
        <input
          type="text"
          id="studentName"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-orange focus:border-primary-orange sm:text-sm"
          placeholder="e.g., Alice Johnson"
          required
        />
      </div>

      <div>
        <label htmlFor="studentSession" className="block text-sm font-medium text-gray-700 mb-1">
          Session
        </label>
        <input
          type='text'
          id="sessionId"
          name="sessionId"
          value={formData.sessionId}
          readOnly
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 sm:text-sm"
          required
        />
      </div>
      
      <div>
        <label htmlFor="term-select" className="block text-sm font-medium text-gray-700 mb-1">
            Select Term to View Balance
        </label>
        <select
            id="term-select"
            value={selectedTermId}
            onChange={handleTermChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-orange focus:border-primary-orange sm:text-sm"
        >
            {terms.map(term => (
                <option key={term.id} value={term.id}>{term.name}</option>
            ))}
        </select>
      </div>

      <div>
        <label htmlFor="balance" className="block text-sm font-medium text-gray-700 mb-1">
          Balance for Selected Term (₦)
        </label>
        <input
          type="text"
          id="balance"
          name="balance"
          value={`₦${termBalance.toLocaleString()}`}
          readOnly
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 sm:text-sm"
        />
      </div>

      <div className="flex justify-end pt-4">
        <button
          type="submit"
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-orange hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-orange transition-colors cursor-pointer"
        >
          {initialData ? 'Update Student' : 'Add Student'}
        </button>
      </div>
    </form>
  );
};

export default StudentForm;