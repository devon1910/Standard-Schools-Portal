import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { FaEdit, FaTrashAlt, FaPlus, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import QuestionForm from '../components/QuestionForm';
import Table from '../components/Table';
import Modal from '../components/Modal';
import { deleteQuestionData, submitQuestionData } from '../services/StandardSchoolsAPIService';
import { useDashboardData } from '../layouts/MainLayout';
// Import the custom hook

const QuestionsPage = () => {
  // Get all data and functions from context
  const {
    dashboardData,
    availableQuestionType,
    isLoading,
    filters,
    updateFilters,
    clearAllFilters,
    refetchData,
    getFilterDisplayNames
  } = useDashboardData();

  // Local state for modal and editing
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);

  const tableHeaders = ['Subject', 'Question', 'Actions'];

  const handleDeleteQuestion = async (questionId) => {
    if (window.confirm('Are you sure you want to delete this question?')) {
      try {
        await deleteQuestionData(questionId);
        toast.success('Question deleted successfully');
        refetchData();
      } catch (error) {
        toast.error('Failed to delete question');
        console.error('Error deleting question:', error);
      }
    }
  };

  const tableRows = dashboardData.questions.items.map(q => ({
    id: q.id,
    data: [q.subject.name, q.questionText],
    actions: (
      <div className="flex space-x-2">
        <button
          onClick={() => {
            setEditingQuestion({
              id: q.id,
              questionText: q.questionText,
              subjectId: q.subject.id,
              classId: q.class.id,
              sessionId: q.session.id,
              termId: q.term.id,
              type: q.type
            });
            setIsModalOpen(true);
          }}
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

  const handleSubmitQuestion = async (formData) => {
    try {
      await submitQuestionData(formData);
      toast.success(editingQuestion ? 'Question updated successfully' : 'Question added successfully');
      closeModal();
      refetchData();
    } catch (error) {
      toast.error(editingQuestion ? 'Failed to update question' : 'Failed to add question');
      console.error('Error submitting question:', error);
    }
  };

  const handlePageChange = (newPage) => {
    const totalPages = dashboardData.questions.totalPages;
    if (newPage >= 1 && newPage <= totalPages) {
      updateFilters({ page: newPage });
    }
  };

  const renderPagination = () => {
    const { totalPages, totalRecords } = dashboardData.questions;
    const { page: currentPage, pageSize } = filters;
    
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
            value={filters.sessionId}
            onChange={(e) => updateFilters({ sessionId: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-orange focus:border-primary-orange sm:text-sm cursor-pointer"
          >
            <option value="">All Sessions</option>
            {dashboardData.sessions.map(session => (
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
            value={filters.classId}
            onChange={(e) => updateFilters({ classId: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-orange focus:border-primary-orange sm:text-sm cursor-pointer"
          >
            <option value="">All Classes</option>
            {dashboardData.classes.map(classItem => (
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
            value={filters.termId}
            onChange={(e) => updateFilters({ termId: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-orange focus:border-primary-orange sm:text-sm cursor-pointer"
          >
            <option value="">All Terms</option>
            {dashboardData.terms.map(term => (
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
            value={filters.questionType}
            onChange={(e) => updateFilters({ questionType: e.target.value })}
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
      {(filters.sessionId || filters.termId || filters.classId || filters.questionType) && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm font-medium text-gray-700">Active Filters:</span>
            {filters.sessionId && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                Session: {getFilterDisplayNames().sessionName}
              </span>
            )}
            {filters.classId && (
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                Class: {getFilterDisplayNames().className}
              </span>
            )}
            {filters.termId && (
              <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                Term: {getFilterDisplayNames().termName}
              </span>
            )}
            {filters.questionType && (
              <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                Type: {getFilterDisplayNames().typeName}
              </span>
            )}
            <button
              onClick={clearAllFilters}
              className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full hover:bg-red-200 transition-colors"
            >
              Clear All
            </button>
          </div>
        </div>
      )}

      {dashboardData.questions.items.length > 0 ? (
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
          onSubmit={handleSubmitQuestion} 
          initialData={editingQuestion} 
          allSessions={dashboardData.sessions} 
          allTerms={dashboardData.terms}
          allSubjects={dashboardData.subjects}
          allClassTypes={dashboardData.classTypes}
          availableClasses={dashboardData.classes} 
        />
      </Modal>
    </div>
  );
};

export default QuestionsPage;