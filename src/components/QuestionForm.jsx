import React, { useState, useEffect } from "react";

const QuestionForm = ({
  onSubmit,
  initialData,
  allSessions,
  allTerms,
  allSubjects,
  availableClasses,
}) => {
  const [formData, setFormData] = useState({
    subjectId: 0,
    classId: 0,
    type: 0, // 'CA' or 'Exam'
    termId: 0, // Default to current selected term
    sessionId: 0, // Default to current selected session
    questionText: "",
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        subjectId: "",
        classId: "",
        type: "0",
        termId: "1st",
        sessionId: "",
        questionText: "",
      });
    }
  }, [initialData]);

  // Find the selected class to get its classTypeId
  const selectedClass = availableClasses.find(
    (classData) => classData.id == formData.classId
  );

  // Filter subjects based on the classTypeId of the selected class
  const filteredSubjects = selectedClass
    ? allSubjects.filter(
        (subject) => subject.classTypeId == selectedClass.classTypeId
      )
    : [];

  const handleChange = (e) => {
    const { name, value } = e.target;

    // If classTypeId is changed, reset subject and classId
    if (name === "classTypeId") {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
        subjectId: "", // Reset subject when class section changes
        classId: "", // Reset class when class section changes
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
          >
            <option value="">Select Class</option>
            {availableClasses.map((classData) => (
              <option key={classData.id} value={classData.id}>
                {classData.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label
            htmlFor="subject"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Subject
          </label>
          <select
            id="subjectId"
            name="subjectId"
            value={formData.subjectId}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-orange focus:border-primary-orange sm:text-sm"
            required
            disabled={!formData.classId}
          >
            <option value="">Select Subject</option>
            {filteredSubjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>
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
            <option value="0">Continuous Assessment (CA)</option>
            <option value="1">Exam</option>
          </select>
        </div>

        <div className="flex-1">
          <label
            htmlFor="sessionId"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Session
          </label>
          <select
            id="sessionId"
            name="sessionId"
            value={formData.sessionId}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-orange focus:border-primary-orange sm:text-sm"
            required
          >
            <option value="">Select Session</option>
            {allSessions.map((session) => (
              <option key={session.id} value={session.id}>
                {session.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1">
          <label
            htmlFor="termId"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Term
          </label>
          <select
            id="termId"
            name="termId"
            value={formData.termId}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-orange focus:border-primary-orange sm:text-sm"
            required
          >
            <option value="">Select Term</option>
            {allTerms.map((term) => (
              <option key={term.id} value={term.id}>
                {term.name}
              </option>
            ))}
          </select>
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
