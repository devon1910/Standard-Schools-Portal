import React, { useState, useEffect } from 'react';

const StudentForm = ({ onSubmit, classId, selectedSession, initialData, selectedTermName, selectedTermId }) => {
  const [formData, setFormData] = useState({
    name: '',
    id: 0,
    classId: classId,
    sessionId: selectedSession,
    isFeePaid: false,
    balance: ''
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        isFeePaid: initialData.isFeePaid !== undefined ? initialData.isFeePaid : false,
        balance: initialData.balance !== undefined ? initialData.balance : ''
      });
    } else {
      setFormData(prev => ({
        ...prev,
        name: '',
        id: 0,
        classId: classId,
        sessionId: selectedSession,
        isFeePaid: false,
        balance: ''
      }));
    }
  }, [initialData, classId, selectedSession]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
      ...(name === 'isFeePaid' && checked ? { balance: 0 } : {})
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const { name, id, classId: studentClassId, sessionId: studentSessionId, isFeePaid, balance } = formData;
    onSubmit({ name, id, classId: studentClassId, sessionId: studentSessionId, isFeePaid, balance, selectedTermId });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-4">
  
      {/* Selected Term Field */}
      <div>
        <label htmlFor="selectedTerm" className="block text-sm font-medium text-gray-700 mb-1">
          Selected Term
        </label>
        <input
          type="text"
          id="selectedTerm"
          name="selectedTerm"
          value={selectedTermName || ''}
          readOnly
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 sm:text-sm"
        />
      </div>
      {/* Student Name Field */}
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
      {/* Fee Paid Checkbox */}
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="isFeePaid"
          name="isFeePaid"
          checked={formData.isFeePaid}
          onChange={handleChange}
          className="h-4 w-4 text-primary-orange focus:ring-primary-orange border-gray-300 rounded"
        />
        <label htmlFor="isFeePaid" className="text-sm font-medium text-gray-700">
          {`Is fee completely paid for ${selectedTermName || ''} Term?`}
        </label>
      </div>
      {/* Balance Field */}
      <div>
        <label htmlFor="balance" className="block text-sm font-medium text-gray-700 mb-1">
          {formData.isFeePaid ? 'Balance (₦)' : 'Amount Owed (₦)'}
        </label>
        <input
          type="number"
          id="balance"
          name="balance"
          value={formData.isFeePaid ? 0 : formData.balance}
          onChange={handleChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-orange focus:border-primary-orange sm:text-sm bg-gray-100"
          placeholder="e.g., 50000"
          min="0"
          required={!formData.isFeePaid}
          disabled={formData.isFeePaid}
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