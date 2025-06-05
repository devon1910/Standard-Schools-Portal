import React, { useState, useEffect } from 'react';

const StudentForm = ({ onSubmit, initialData, defaultSession, defaultTerm }) => {
  const [formData, setFormData] = useState({
    name: '',
    admissionNumber: '',
    term: defaultTerm || '1st',
    session: defaultSession || '',
    feePaid: false, // New field
    balance: 0,     // New field
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        name: '',
        admissionNumber: '',
        term: defaultTerm || '1st',
        session: defaultSession || '',
        feePaid: false,
        balance: 0,
      });
    }
  }, [initialData, defaultSession, defaultTerm]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
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
        <label htmlFor="admissionNumber" className="block text-sm font-medium text-gray-700 mb-1">
          Admission Number
        </label>
        <input
          type="text"
          id="admissionNumber"
          name="admissionNumber"
          value={formData.admissionNumber}
          onChange={handleChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-orange focus:border-primary-orange sm:text-sm"
          placeholder="e.g., SN001"
          required
        />
      </div>

      <div>
        <label htmlFor="studentSession" className="block text-sm font-medium text-gray-700 mb-1">
          Session
        </label>
        <input
          type="text"
          id="studentSession"
          name="session"
          value={formData.session}
          readOnly
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 cursor-not-allowed sm:text-sm"
          required
        />
      </div>

      <div>
        <label htmlFor="studentTerm" className="block text-sm font-medium text-gray-700 mb-1">
          Term
        </label>
        <input
          type="text"
          id="studentTerm"
          name="term"
          value={formData.term}
          readOnly
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 cursor-not-allowed sm:text-sm"
          required
        />
      </div>

      {/* New Fields: Fee Status and Balance */}
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="feePaid"
          name="feePaid"
          checked={formData.feePaid}
          onChange={handleChange}
          className="h-4 w-4 text-primary-orange focus:ring-primary-orange border-gray-300 rounded"
        />
        <label htmlFor="feePaid" className="text-sm font-medium text-gray-700">
          Fee Paid
        </label>
      </div>

      <div>
        <label htmlFor="balance" className="block text-sm font-medium text-gray-700 mb-1">
          Balance Owed (₦)
        </label>
        <input
          type="number"
          id="balance"
          name="balance"
          value={formData.balance}
          onChange={handleChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-orange focus:border-primary-orange sm:text-sm"
          placeholder="e.g., 50000"
          min="0"
          required
        />
      </div>
      {/* End New Fields */}

      <div className="flex justify-end">
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