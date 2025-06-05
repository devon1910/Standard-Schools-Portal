import React, { useState, useEffect } from 'react';

const SessionForm = ({ onSubmit, initialData }) => {
  const [sessionName, setSessionName] = useState('');

  useEffect(() => {
    if (initialData) {
      setSessionName(initialData.name);
    } else {
      setSessionName('');
    }
  }, [initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ name: sessionName });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      <div>
        <label htmlFor="sessionName" className="block text-sm font-medium text-gray-700 mb-1">
          Session Name (e.g., 2024/2025)
        </label>
        <input
          type="text"
          id="sessionName"
          name="sessionName"
          value={sessionName}
          onChange={(e) => setSessionName(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-orange focus:border-primary-orange sm:text-sm"
          placeholder="e.g., 2024/2025"
          required
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-orange hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-orange transition-colors cursor-pointer"
        >
          {initialData ? 'Update Session' : 'Create Session'}
        </button>
      </div>
    </form>
  );
};

export default SessionForm;