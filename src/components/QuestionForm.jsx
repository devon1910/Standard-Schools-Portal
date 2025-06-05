import React, { useState, useEffect } from "react";

const QuestionForm = ({
  onSubmit,
  initialData,
  defaultSession,
  defaultTerm,
  allSubjects,
  allClassTypes,
  availableClasses,
}) => {
  const [formData, setFormData] = useState({
    subject: "",
    classTypeId: 0,
    classId: 0,
    type: "CA", // 'CA' or 'Exam'
    term: defaultTerm || "1st", // Default to current selected term
    session: defaultSession || "", // Default to current selected session
    questionText: "",
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        subject: "",
        classTypeId: "",
        classId: "",
        type: "CA",
        term: defaultTerm || "1st",
        session: defaultSession || "",
        questionText: "",
      });
    }
  }, [initialData, defaultSession, defaultTerm]);

  // Filter subjects based on selected classTypeId
  const filteredSubjects = allSubjects.filter(
    (subject) => subject.classTypeId == formData.classTypeId
  );

  // Filter classes based on selected classTypeId
  const filteredClasses = availableClasses.filter(
    (classData) => classData.classTypeId == formData.classTypeId
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // If classTypeId is changed, reset subject and classId
    if (name === "classTypeId") {
      setFormData((prev) => ({ 
        ...prev, 
        [name]: value,
        subject: "", // Reset subject when class section changes
        classId: ""  // Reset class when class section changes
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      <div className="flex gap-4">
        <div className="flex-1">
          <label
            htmlFor="classTypeId"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Class Section
          </label>
          <select
            id="classTypeId"
            name="classTypeId"
            value={formData.classTypeId}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-orange focus:border-primary-orange sm:text-sm"
            required
          >
            <option value="">Select Class Section</option>
            {allClassTypes.map((classType) => (
              <option key={classType.id} value={classType.id}>
                {classType.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1">
          <label
            htmlFor="classId"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Class
          </label>
          <select
            id="classId"
            name="classId"
            value={formData.classId}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-orange focus:border-primary-orange sm:text-sm"
            required
            disabled={!formData.classTypeId}
          >
            <option value="">Select Class</option>
            {filteredClasses.map((classData) => (
              <option key={classData.id} value={classData.id}>
                {classData.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      <div>
        <label
          htmlFor="subject"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Subject
        </label>
        <select
          id="subject"
          name="subject"
          value={formData.subject}
          onChange={handleChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-orange focus:border-primary-orange sm:text-sm"
          required
          disabled={!formData.classTypeId}
        >
          <option value="">Select Subject</option>
          {filteredSubjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label
            htmlFor="type"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
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

        <div className="flex-1">
          <label
            htmlFor="session"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Session
          </label>
          <input
            type="text"
            id="session"
            name="session"
            value={formData.session}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 cursor-not-allowed sm:text-sm"
            required
            readOnly
          />
        </div>

        <div className="flex-1">
          <label
            htmlFor="term"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Term
          </label>
          <input
            type="text"
            id="term"
            name="term"
            value={formData.term}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 cursor-not-allowed sm:text-sm"
            required
            readOnly
          />
        </div>
      </div>
      
      <div>
        <label
          htmlFor="questionText"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
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
          {initialData ? "Update Question" : "Add Question"}
        </button>
      </div>
    </form>
  );
};

export default QuestionForm;