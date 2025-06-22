import React, { useState, useEffect } from 'react';
import { useDashboardData } from '../layouts/MainLayout';

const SubjectForm = ({ onSubmit, initialData }) => {
  const [formData, setFormData] = useState({
    id: 0,
    name: '',
    classTypeId: ''
  });

  const { dashboardData } = useDashboardData();
  const { classTypes } = dashboardData;

  useEffect(() => {
    if (initialData) {
      setFormData({
        id: initialData.id,
        name: initialData.name,
        classTypeId: initialData.classTypeId
      });
    } else {
      setFormData({
        id: 0,
        name: '',
        classTypeId: classTypes.length > 0 ? classTypes[0].id : ''
      });
    }
  }, [initialData, classTypes]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submissionData = {
        ...formData,
        classTypeId: parseInt(formData.classTypeId, 10)
    };
    onSubmit(submissionData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      <div>
        <label htmlFor="classTypeId" className="block text-sm font-medium text-gray-700 mb-1">
          Class Type
        </label>
        <select
          id="classTypeId"
          name="classTypeId"
          value={formData.classTypeId}
          onChange={handleChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-orange focus:border-primary-orange sm:text-sm"
          required
        >
          {classTypes.map(ct => (
            <option key={ct.id} value={ct.id}>
              {ct.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Subject Name
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-orange focus:border-primary-orange sm:text-sm"
          placeholder="e.g., Mathematics"
          required
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-orange hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-orange transition-colors cursor-pointer"
        >
          {initialData ? 'Update Subject' : 'Create Subject'}
        </button>
      </div>
    </form>
  );
};

export default SubjectForm; 