import React, { useState, useEffect } from 'react';

const ClassForm = ({ onSubmit, initialData, classTypes, selectedSession }) => {
  const [formData, setFormData] = useState({
    id:0,
    name: '',
    classTeacher: '',
    classTypeId: 0,
    sessionId: 0
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        id:0,
        name: '',
        classTeacher: '',
        classTypeId: 0,
        sessionId: 0
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
       <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Class Type
        </label>
        <select
         className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-orange focus:border-primary-orange sm:text-sm"
         required
         id="classTypeId"
         name="classTypeId"
         value={formData.classTypeId}
         onChange={handleChange}
        >
        <option key={0} value="0">Select a Class Type </option>

          {classTypes.map((classType) => (
            <option key={classType.id} value={classType.id}>
              {classType.name}
            </option>
          ))} 
        </select>
      
      </div>
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Class Name
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-orange focus:border-primary-orange sm:text-sm"
          placeholder="e.g., JSS1 A"
          required
        />
      </div>

      <div>
        <label htmlFor="classTeacher" className="block text-sm font-medium text-gray-700 mb-1">
          Class Teacher (Optional)
        </label>
        <input
          type="text"
          id="classTeacher"
          name="classTeacher"
          value={formData.classTeacher}
          onChange={handleChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-orange focus:border-primary-orange sm:text-sm"
          placeholder="e.g., Mr. John Doe"
        />
      </div>

      <div>
        <label htmlFor="classTeacher" className="block text-sm font-medium text-gray-700 mb-1">
          Academic Session
        </label>
        <input
          type="text"
          id="session"
          name="session"
          value={selectedSession}
          readOnly
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-orange focus:border-primary-orange sm:text-sm"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-orange hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-orange transition-colors cursor-pointer"
        >
          {initialData ? 'Update Class' : 'Add Class'}
        </button>
      </div>
    </form>
  );
};

export default ClassForm;