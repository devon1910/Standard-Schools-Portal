import React, { useState, useEffect, useRef } from 'react';
import QuestionForm from '../components/QuestionForm';
import Table from '../components/Table';
import Modal from '../components/Modal';

// Optional: Import icons if you install react-icons
import { FaEdit, FaTrashAlt, FaPlus } from 'react-icons/fa';
import { getDashboardData } from '../services/StandardSchoolsAPIService';

const QuestionsPage = () => {
    const[isLoading, setIsLoading] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);

  const [selectedSession, setSelectedSession] = useState('2024/2025');
  const [selectedTerm, setSelectedTerm] = useState('1st');
  const [selectedClass, setSelectedClass] = useState('JSS1 A');
  const [selectedQuestionType, setSelectedQuestionType] = useState('CA');

  const [availableSessions, setAvailableSessions] = useState([]);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [availableTerms,setAvailableTerms] = useState([]);
  const availableQuestionType=[{id:0, name:'CA'},{id:1, name: 'Exam'}];
  const [allQuestions, setAllQuestions] = useState([]);
  const [allSubjects, setAllSUbjects] = useState([]);
  const [allClassTypes, setAllClassTypes] = useState([]);
 

    useEffect(() => {
        setIsLoading(true)
        getDashboardData().then((data) => {
            console.log("data.data.sessions: ",data);
            setAvailableSessions(data.data.sessions)
            setAvailableClasses(data.data.classes)
            setAvailableTerms(data.data.terms)
            setAllQuestions(data.data.questions)
            setAllSUbjects(data.data.subjects)
            setAllClassTypes(data.data.classTypes)

        }).catch((error) => {
            console.log(error)
        }).finally(() => {
            setIsLoading(false);
        })
    },[])
  const [isModalOpen, setIsModalOpen] = useState(false);

  


  const filteredQuestions = allQuestions.filter(
    (q) => q.session.name === selectedSession && q.term.name === selectedTerm
  );

  const tableHeaders = ['Subject', 'Question','Actions'];


  const tableRows = filteredQuestions.map(q => ({
    id: q.id,
    data: [q.subject.name,q.questionText],
    actions: (
      <div className="flex space-x-2">
        <button
          onClick={() => { setEditingQuestion(q); setIsModalOpen(true); }}
          className="px-3 py-1 bg-primary-orange text-white rounded hover:bg-opacity-80 transition-colors cursor-pointer flex items-center justify-center space-x-1"
          title="Edit Question"
        >
          <FaEdit className="inline-block" />
          <span>Edit</span>
        </button>
        <button
          onClick={() => alert(`Delete question ${q.id}`)} // Replace with actual delete logic
          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors cursor-pointer flex items-center justify-center space-x-1"
          title="Delete Question"
        >
          <FaTrashAlt className="inline-block" />
          <span>Delete</span>
        </button>
      </div>
    )
  }));

  const handleAddQuestionClick = () => {
    setEditingQuestion(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingQuestion(null);
  };

  const handleFormSubmit = (data) => {
    console.log('Form Submitted:', data);
    closeModal();
  };

  if (isLoading) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-primary-orange"></div>
    </div>
  );
}

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-semibold text-gray-800">Questions Bank</h2>
        <button
          onClick={handleAddQuestionClick}
          className="px-6 py-3 bg-primary-orange text-white font-medium rounded-lg shadow-md hover:bg-opacity-80 transition-colors cursor-pointer flex items-center justify-center space-x-2"
          title="Add New Question"
        >
          <FaPlus className="inline-block" />
          <span>Add New Question</span>
        </button>
      </div>

      {/* Session and Term Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <label htmlFor="session-filter" className="block text-sm font-medium text-gray-700 mb-1">
            Select Session
          </label>
          <select
            id="session-filter"
            name="session"
            value={selectedSession}
            onChange={(e) => setSelectedSession(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-orange focus:border-primary-orange sm:text-sm cursor-pointer"
          >
            {availableSessions.map(session => (
              <option key={session.id} value={session.id}>{session.name}</option>
            ))}
          </select>
        </div>

        <div className="flex-1">
          <label htmlFor="term-filter" className="block text-sm font-medium text-gray-700 mb-1">
            Select Class
          </label>
          <select
            id="class-filter"
            name="class"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-orange focus:border-primary-orange sm:text-sm cursor-pointer"
          >
            {availableClasses.map(term => (
              <option key={term.id} value={term.id}>{term.name}</option>
            ))}
          </select>
        </div>
         <div className="flex-1">
          <label htmlFor="term-filter" className="block text-sm font-medium text-gray-700 mb-1">
            Select Term
          </label>
          <select
            id="term-filter"
            name="term"
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-orange focus:border-primary-orange sm:text-sm cursor-pointer"
          >
            {availableTerms.map(term => (
              <option key={term.id} value={term.id}>{term.name}</option>
            ))}
          </select>
        </div>
         <div className="flex-1">
          <label htmlFor="term-filter" className="block text-sm font-medium text-gray-700 mb-1">
            Select Questions Type
          </label>
          <select
            id="questionType-filter"
            name="questionType"
            value={selectedQuestionType}
            onChange={(e) => setSelectedQuestionType(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-orange focus:border-primary-orange sm:text-sm cursor-pointer"
          >
            {availableQuestionType.map(type => (
              <option key={type.id} value={type.id}>{type.name}</option>
            ))}
          </select>
        </div>
      </div>

      {filteredQuestions.length > 0 ? (
        <div className="overflow-x-auto">
          <Table headers={tableHeaders} rows={tableRows} />
        </div>
      ) : (
        <p className="text-center text-gray-600 py-8">
          No questions found for the selected session ({selectedSession}) and term ({selectedTerm}).
        </p>
      )}
       
      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingQuestion ? 'Edit Question' : 'Add New Question'}>
        <QuestionForm 
        onSubmit={handleFormSubmit} 
        initialData={editingQuestion} 
        defaultSession={selectedSession} 
        defaultTerm={selectedTerm}
        allSubjects={allSubjects}
        allClassTypes={allClassTypes}
        availableClasses={availableClasses} />
        
      </Modal>
    </div>
  );
};

export default QuestionsPage;