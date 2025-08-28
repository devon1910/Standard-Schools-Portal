import React, { useState, useEffect } from 'react';
import StudentFormInfoData from '../constants/StudentFormInfoData';

const StudentForm = ({ onSubmit, classId, selectedSession, initialData, selectedTermName, selectedTermId }) => {
  const [formData, setFormData] = useState({
    name: '',
    id: 0,
    classId: classId,
    sessionId: selectedSession,
    isFeePaid: false,
    balance: '',
    gender: '',
    dob: '',
    tribe: '',
    stateOfOrigin: '',
    lgaOfOrigin: '',
    classAtAdmission: '',
    dateOfAdmission: '',
    admissionNumber: '',
    yearOfAdmission: '',
    parentName: '',
    parentAddress: '',
    parentPhone: '',
    parentReligion: ''
  });

  const [lgAs, setLgAs] = useState([]);

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        isFeePaid: initialData.isFeePaid !== undefined ? initialData.isFeePaid : false,
        balance: initialData.balance !== undefined ? initialData.balance : '',
        // Initialize new fields from initialData
        gender: initialData.gender || '',
        dob: initialData.dob || '',
        tribe: initialData.tribe || '',
        stateOfOrigin: initialData.stateOfOrigin || '',
        lgaOfOrigin: initialData.lgaOfOrigin || '',
        classAtAdmission: initialData.classAtAdmission || '',
        dateOfAdmission: initialData.dateOfAdmission || '',
        admissionNumber: initialData.admissionNumber || '',
        yearOfAdmission: initialData.yearOfAdmission || '',
        parentName: initialData.parentName || '',
        parentAddress: initialData.parentAddress || '',
        parentPhone: initialData.parentPhone || '',
        parentReligion: initialData.parentReligion || ''
      });
    } else {
      // Reset all fields when no initialData is provided
      setFormData(prev => ({
        ...prev,
        name: '',
        id: 0,
        classId: classId,
        sessionId: selectedSession,
        isFeePaid: false,
        balance: '',
        gender: '',
        dob: '',
        tribe: '',
        stateOfOrigin: '',
        lgaOfOrigin: '',
        classAtAdmission: '',
        dateOfAdmission: '',
        admissionNumber: '',
        yearOfAdmission: '',
        parentName: '',
        parentAddress: '',
        parentPhone: '',
        parentReligion: ''
      }));
    }
  }, [initialData, classId, selectedSession]);

  useEffect(() => {
    // Update the LGAs dropdown when the state of origin changes
    if (formData.stateOfOrigin) {
      const selectedState = StudentFormInfoData.states.find(s => s.name === formData.stateOfOrigin);
      setLgAs(selectedState ? selectedState.lgAs : []);
      // Reset LGA field if the state changes to prevent invalid selection
      setFormData(prev => ({ ...prev, lgaOfOrigin: '' }));
    } else {
      setLgAs([]);
    }
  }, [formData.stateOfOrigin]);

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
    onSubmit({ ...formData, selectedTermId });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-4">
      
      {/* Selected Term Field (from original code) */}
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

      {/* Student Name Field (from original code) */}
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


      {/* Admission Number & Year of Admission */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            placeholder="e.g., 2025/AD/001"
            required
          />
        </div>
        <div>
          <label htmlFor="yearOfAdmission" className="block text-sm font-medium text-gray-700 mb-1">
            Year of Admission
          </label>
          <input
            type="number"
            id="yearOfAdmission"
            name="yearOfAdmission"
            value={formData.yearOfAdmission}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-orange focus:border-primary-orange sm:text-sm"
            placeholder="e.g., 2025"
            min="1900"
            max={new Date().getFullYear()}
            required
          />
        </div>
      </div>

      {/* Admission Meta info */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="classAtAdmission" className="block text-sm font-medium text-gray-700 mb-1">
            Class At Admission
          </label>
          <input
            type="text"
            id="classAtAdmission"
            name="classAtAdmission"
            value={formData.classAtAdmission}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-orange focus:border-primary-orange sm:text-sm"
            placeholder="e.g., JSS1 A"
            required
          />
        </div>
        <div>
          <label htmlFor="dateOfAdmission" className="block text-sm font-medium text-gray-700 mb-1">
            Date Of Admission
          </label>
          <input
            type="date"
            id="dateOfAdmission"
            name="dateOfAdmission"
            value={formData.dateOfAdmission}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-orange focus:border-primary-orange sm:text-sm"
            placeholder="e.g 8/1/2025"
            min="1900"
            max={new Date().getFullYear()}
            required
          />
        </div>
      </div>

      {/* Date of Birth & Gender */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="dob" className="block text-sm font-medium text-gray-700 mb-1">
            Date of Birth
          </label>
          <input
            type="date"
            id="dob"
            name="dob"
            value={formData.dob}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-orange focus:border-primary-orange sm:text-sm"
            required
          />
        </div>
        <div>
          <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
            Gender
          </label>
          <select
            id="gender"
            name="gender"
            value={formData.gender}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-orange focus:border-primary-orange sm:text-sm"
            required
          >
            <option value="">Select Gender</option>
            {StudentFormInfoData.genders.map(gender => (
              <option key={gender} value={gender}>{gender}</option>
            ))}
          </select>
        </div>
      </div>

      {/* State of Origin & LGA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="stateOfOrigin" className="block text-sm font-medium text-gray-700 mb-1">
            State of Origin
          </label>
          <select
            id="stateOfOrigin"
            name="stateOfOrigin"
            value={formData.stateOfOrigin}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-orange focus:border-primary-orange sm:text-sm"
            required
          >
            <option value="">Select State</option>
            {StudentFormInfoData.states.map(state => (
              <option key={state.name} value={state.name}>{state.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="lgaOfOrigin" className="block text-sm font-medium text-gray-700 mb-1">
            L.G.A. of Origin
          </label>
          <select
            id="lgaOfOrigin"
            name="lgaOfOrigin"
            value={formData.lgaOfOrigin}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-orange focus:border-primary-orange sm:text-sm"
            required
            disabled={!formData.stateOfOrigin}
          >
            <option value="">Select L.G.A.</option>
            {lgAs.map(lga => (
              <option key={lga} value={lga}>{lga}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tribe & Religion */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="tribe" className="block text-sm font-medium text-gray-700 mb-1">
            Tribe
          </label>
          <select
            id="tribe"
            name="tribe"
            value={formData.tribe}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-orange focus:border-primary-orange sm:text-sm"
            required
          >
            <option value="">Select Tribe</option>
            {StudentFormInfoData.tribes.map(tribe => (
              <option key={tribe} value={tribe}>{tribe}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="parentReligion" className="block text-sm font-medium text-gray-700 mb-1">
            Parent's Religion
          </label>
          <select
            id="parentReligion"
            name="parentReligion"
            value={formData.parentReligion}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-orange focus:border-primary-orange sm:text-sm"
            required
          >
            <option value="">Select Religion</option>
            {StudentFormInfoData.religions.map(religion => (
              <option key={religion} value={religion}>{religion}</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Parent's/Guardian's Name */}
      <div>
        <label htmlFor="parentName" className="block text-sm font-medium text-gray-700 mb-1">
          Parent's/Guardian's Name
        </label>
        <input
          type="text"
          id="parentName"
          name="parentName"
          value={formData.parentName}
          onChange={handleChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-orange focus:border-primary-orange sm:text-sm"
          placeholder="e.g., John Doe"
          required
        />
      </div>

      {/* Phone Numbers */}
      <div>
        <label htmlFor="parentPhone" className="block text-sm font-medium text-gray-700 mb-1">
          Parent's Phone Number
        </label>
        <input
          type="tel"
          id="parentPhone"
          name="parentPhone"
          value={formData.parentPhone}
          onChange={handleChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-orange focus:border-primary-orange sm:text-sm"
          placeholder="e.g., 08012345678"
          required
        />
      </div>

      {/* Address */}
      <div>
        <label htmlFor="parentAddress" className="block text-sm font-medium text-gray-700 mb-1">
          Student's/Parent's Address
        </label>
        <textarea
          id="parentAddress"
          name="parentAddress"
          value={formData.parentAddress}
          onChange={handleChange}
          rows="3"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-orange focus:border-primary-orange sm:text-sm"
          placeholder="e.g., 123 School Road, Asokoro, Abuja"
          required
        ></textarea>
      </div>

      {/* Fee Paid Checkbox (from original code) */}
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

      {/* Balance Field (from original code) */}
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
          {initialData ? 'Update Changes' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
};

export default StudentForm;