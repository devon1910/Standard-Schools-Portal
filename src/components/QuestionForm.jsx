import React, { useState, useEffect } from 'react';

const QuestionForm = ({ onSubmit, initialData, defaultSession, defaultTerm }) => {
  const [formData, setFormData] = useState({
    subject: '',
    type: 'CA', // 'CA' or 'Exam'
    term: defaultTerm || '1st', // Default to current selected term
    session: defaultSession || '', // Default to current selected session
    questionText: '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        subject: '',
        type: 'CA',
        term: defaultTerm || '1st',
        session: defaultSession || '',
        questionText: '',
      });
    }
  }, [initialData, defaultSession, defaultTerm]);

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
        <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
          Subject
        </label>
        <input
          type="text"
          id="subject"
          name="subject"
          value={formData.subject}
          onChange={handleChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-orange focus:border-primary-orange sm:text-sm"
          placeholder="e.g., Mathematics"
          required
        />
      </div>

      <div>
        <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
          Type
        </label>
        <select
          id="type"
          name="type"
          value={formData.type}
          onChange={handleChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-orange focus:border-primary-orange sm:text-sm"
          required
        >
          <option value="CA">Continuous Assessment (CA)</option>
          <option value="Exam">Exam</option>
        </select>
      </div>

      {/* Session and Term are now read-only for new questions, driven by page selection */}
      <div>
        <label htmlFor="session" className="block text-sm font-medium text-gray-700 mb-1">
          Session
        </label>
        <input
          type="text"
          id="session"
          name="session"
          value={formData.session}
          readOnly // Make read-only as it's selected on the page
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 cursor-not-allowed sm:text-sm"
          required
        />
      </div>

      <div>
        <label htmlFor="term" className="block text-sm font-medium text-gray-700 mb-1">
          Term
        </label>
        <input
          type="text"
          id="term"
          name="term"
          value={formData.term}
          readOnly // Make read-only as it's selected on the page
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 cursor-not-allowed sm:text-sm"
          required
        />
      </div>

      <div>
        <label htmlFor="questionText" className="block text-sm font-medium text-gray-700 mb-1">
          Question
        </label>
        <textarea
          id="questionText"
          name="questionText"
          value={formData.questionText}
          onChange={handleChange}
          rows="4"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-orange focus:border-primary-orange sm:text-sm"
          placeholder="Enter the question here..."
          required
        ></textarea>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-orange hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-orange transition-colors"
        >
          {initialData ? 'Update Question' : 'Add Question'}
        </button>
      </div>
    </form>
  );
};

export default QuestionForm;