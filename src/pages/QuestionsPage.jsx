import React, { useState, useEffect, useRef } from 'react';
import QuestionForm from '../components/QuestionForm';
import Table from '../components/Table';
import Modal from '../components/Modal';

// Optional: Import icons if you install react-icons
import { FaEdit, FaTrashAlt, FaPlus, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { deleteQuestionData, getDashboardData, submitQuestionData } from '../services/StandardSchoolsAPIService';

const QuestionsPage = () => {
    const[isLoading, setIsLoading] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);

  const [selectedSession, setSelectedSession] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedQuestionType, setSelectedQuestionType] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [availableSessions, setAvailableSessions] = useState([]);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [availableTerms,setAvailableTerms] = useState([]);
  const availableQuestionType=[{id:0, name:'CA'},{id:1, name: 'Exam'}];
  const [questions, setQuestions] = useState([]);
  const [allSubjects, setAllSUbjects] = useState([]);
  const [allClassTypes, setAllClassTypes] = useState([]);
 
    const GetDashboardGenericData = async () => {   
        const filters = {
            sessionId: selectedSession || null,
            termId: selectedTerm || null,
            classId: selectedClass || null,
            questionType: selectedQuestionType ? availableQuestionType[parseInt(selectedQuestionType)].name : null,
            page: currentPage,
            pageSize: pageSize
        };

        getDashboardData(filters).then((data) => {
          setAvailableSessions(data.data.sessions)
          setAvailableClasses(data.data.classes)
          setAvailableTerms(data.data.terms)
          setQuestions(data.data.questions.items || data.data.questions)
          setTotalRecords(data.data.questions.totalRecords || data.data.questions.length)
          setTotalPages(data.data.questions.totalPages || Math.ceil((data.data.questions.length || 0) / pageSize))
          setAllSUbjects(data.data.subjects)
          setAllClassTypes(data.data.classTypes)
          
        }).catch((error) => {
            console.log(error)
        }).finally(() => {
            setIsLoading(false);
        })

    }

    useEffect(() => {
        setIsLoading(true)
        setCurrentPage(1); // Reset to first page when filters change
        GetDashboardGenericData();
    },[selectedSession, selectedTerm, selectedClass, selectedQuestionType])

    useEffect(() => {
        setIsLoading(true)
        GetDashboardGenericData();
    },[currentPage])

  const [isModalOpen, setIsModalOpen] = useState(false);

  const tableHeaders = ['Subject', 'Question','Actions'];

  const handleDeleteQuestion = (questionId) => {  
    setIsLoading(true)
    if (window.confirm('Are you sure you want to delete this question?')) {
      deleteQuestionData(questionId).then((response) => {
        GetDashboardGenericData();
      }).catch((error) => {
        console.log(error)
        setIsLoading(false)
      })
    } else {
      setIsLoading(false)
    }
  }

  const tableRows = questions.map(q => ({
    id: q.id,
    data: [q.subject.name,q.questionText],
    actions: (
      <div className="flex space-x-2">
        <button
          onClick={() => { setEditingQuestion(
            {
            id:q.id, 
            questionText:q.questionText,
            subjectId:q.subject.id, 
            classId:q.class.id,
            sessionId:q.session.id,
            termId:q.term.id,
            type:q.type
            }); setIsModalOpen(true); }}
          className="px-3 py-1 bg-primary-orange text-white rounded hover:bg-opacity-80 transition-colors cursor-pointer flex items-center justify-center space-x-1"
          title="Edit Question"
        >
          <FaEdit className="inline-block" />
          <span>Edit</span>
        </button>
        <button
          onClick={() => handleDeleteQuestion(q.id)} 
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
     setIsLoading(true)

    submitQuestionData(data).then((response) => {
      console.log('Response: ', response);
      GetDashboardGenericData();
    

    }).catch((error) => {
      console.error('Error: ', error);
      setIsLoading(false)
    })
    closeModal();
     
  };

  // Get current filter display names for the no questions message
  const getFilterDisplayNames = () => {
    const sessionName = availableSessions.find(s => s.id.toString() === selectedSession)?.name || selectedSession;
    const termName = availableTerms.find(t => t.id.toString() === selectedTerm)?.name || selectedTerm;
    const className = availableClasses.find(c => c.id.toString() === selectedClass)?.name || selectedClass;
    const typeName = availableQuestionType.find(t => t.id.toString() === selectedQuestionType)?.name || selectedQuestionType;
    
    return { sessionName, termName, className, typeName };
  };

  const handleClearAllFilters = () => {
    setSelectedSession('');
    setSelectedTerm('');
    setSelectedClass('');
    setSelectedQuestionType('');
    setCurrentPage(1);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pageNumbers = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="flex items-center justify-between mt-6">
        <div className="text-sm text-gray-700">
          Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalRecords)} of {totalRecords} results
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FaChevronLeft className="inline-block mr-1" />
            Previous
          </button>
          
          {startPage > 1 && (
            <>
              <button
                onClick={() => handlePageChange(1)}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                1
              </button>
              {startPage > 2 && <span className="text-gray-500">...</span>}
            </>
          )}
          
          {pageNumbers.map(number => (
            <button
              key={number}
              onClick={() => handlePageChange(number)}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                currentPage === number
                  ? 'text-white bg-primary-orange border border-primary-orange'
                  : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {number}
            </button>
          ))}
          
          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && <span className="text-gray-500">...</span>}
              <button
                onClick={() => handlePageChange(totalPages)}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {totalPages}
              </button>
            </>
          )}
          
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
            <FaChevronRight className="inline-block ml-1" />
          </button>
        </div>
      </div>
    );
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
            <option value="">All Sessions</option>
            {availableSessions.map(session => (
              <option key={session.id} value={session.id}>{session.name}</option>
            ))}
          </select>
        </div>

        <div className="flex-1">
          <label htmlFor="class-filter" className="block text-sm font-medium text-gray-700 mb-1">
            Select Class
          </label>
          <select
            id="class-filter"
            name="class"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-orange focus:border-primary-orange sm:text-sm cursor-pointer"
          >
            <option value="">All Classes</option>
            {availableClasses.map(classItem => (
              <option key={classItem.id} value={classItem.id}>{classItem.name}</option>
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
            <option value="">All Terms</option>
            {availableTerms.map(term => (
              <option key={term.id} value={term.id}>{term.name}</option>
            ))}
          </select>
        </div>
         <div className="flex-1">
          <label htmlFor="questionType-filter" className="block text-sm font-medium text-gray-700 mb-1">
            Select Questions Type
          </label>
          <select
            id="questionType-filter"
            name="questionType"
            value={selectedQuestionType}
            onChange={(e) => setSelectedQuestionType(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-orange focus:border-primary-orange sm:text-sm cursor-pointer"
          >
            <option value="">All Types</option>
            {availableQuestionType.map(type => (
              <option key={type.id} value={type.id}>{type.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Display active filters */}
      {(selectedSession || selectedTerm || selectedClass || selectedQuestionType) && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm font-medium text-gray-700">Active Filters:</span>
            {selectedSession && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                Session: {getFilterDisplayNames().sessionName}
              </span>
            )}
            {selectedClass && (
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                Class: {getFilterDisplayNames().className}
              </span>
            )}
            {selectedTerm && (
              <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                Term: {getFilterDisplayNames().termName}
              </span>
            )}
            {selectedQuestionType && (
              <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                Type: {getFilterDisplayNames().typeName}
              </span>
            )}
            <button
              onClick={handleClearAllFilters}
              className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full hover:bg-red-200 transition-colors"
            >
              Clear All
            </button>
          </div>
        </div>
      )}

      {questions.length > 0 ? (
        <>
          <div className="overflow-x-auto">
            <Table headers={tableHeaders} rows={tableRows} />
          </div>
          {renderPagination()}
        </>
      ) : (
        <p className="text-center text-gray-600 py-8">
          No questions found for the selected filters.
        </p>
      )}
       
      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingQuestion ? 'Edit Question' : 'Add New Question'}>
        <QuestionForm 
        onSubmit={handleFormSubmit} 
        initialData={editingQuestion} 
        allSessions={availableSessions} 
        allTerms={availableTerms}
        allSubjects={allSubjects}
        allClassTypes={allClassTypes}
        availableClasses={availableClasses} />
        
      </Modal>
    </div>
  );
};

export default QuestionsPage;