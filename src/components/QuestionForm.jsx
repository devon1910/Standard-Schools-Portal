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
    questionFile: null,
  });

  const [uploadError, setUploadError] = useState("");
  const [uploadedPreviewUrl, setUploadedPreviewUrl] = useState("");

  useEffect(() => {
    if (initialData) {
      setFormData({ ...initialData, questionFile: null });
    } else {
      setFormData({
        subjectId: "",
        classId: "",
        type: "0",
        termId: "1st",
        sessionId: "",
        questionFile: null,
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
    // If a new file is selected, send multipart FormData to backend
    if (formData.questionFile instanceof File || formData.questionFile) {
      // const multipart = new FormData();
      // multipart.append("subjectId", formData.subjectId);
      // multipart.append("classId", formData.classId);
      // multipart.append("type", formData.type);
      // multipart.append("termId", formData.termId);
      // multipart.append("sessionId", formData.sessionId);
      // multipart.append("questionFile", formData.questionFile);
      // console.log(multipart);
      onSubmit(formData);
      return;
    }

    // Otherwise submit as JSON (e.g., when editing without changing file)
    onSubmit(formData);
  };

  // useEffect(() => {
  //   if (formData?.questionText && typeof formData.questionText === "string" && formData.questionText.startsWith("http")) {
  //     setUploadedPreviewUrl(formData.questionText);
  //   }
  // }, [formData.questionText]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const maxBytes = 10 * 1024 * 1024; // 10MB
    if (file.size > maxBytes) {
      setUploadError("File too large. Max size is 10MB.");
      e.target.value = "";
      return;
    }
    // Ensure identifiers are selected to associate file properly
    const { subjectId, classId, sessionId, termId, type } = formData;
    if (!subjectId || !classId || !sessionId || !termId || (type === "" || type === null || typeof type === "undefined")) {
      setUploadError("Please select Subject, Class, Session, Term and Type before selecting a file.");
      e.target.value = "";
      return;
    }
    setUploadError("");
    setFormData((prev) => ({ ...prev, questionFile: file }));
    try {
      const objectUrl = URL.createObjectURL(file);
      setUploadedPreviewUrl(objectUrl);
    } catch {
      setUploadedPreviewUrl("");
    }
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
          htmlFor="questionFile"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Question (Upload file to server. Max 10MB.)
        </label>
        <input
          id="questionFile"
          name="questionFile"
          type="file"
          required
          onChange={handleFileChange}
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.bmp,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
          disabled={!formData.subjectId || !formData.classId || !formData.sessionId || !formData.termId || (formData.type === "" || formData.type === null || typeof formData.type === "undefined")}
          className="mt-1 block w-full text-sm text-gray-700 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-orange file:text-white hover:file:bg-opacity-80"
        />
        {uploadError && (
          <p className="mt-2 text-sm text-red-600">{uploadError}</p>
        )}
       
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-orange hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-orange transition-colors cursior-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {initialData ? "Update Question" : "Add Question"}
        </button>
      </div>
    </form>
  );
};

export default QuestionForm;
