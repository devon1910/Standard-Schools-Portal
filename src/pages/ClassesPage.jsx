import React, { useState } from "react";
import { toast } from "react-toastify";
import ClassCard from "../components/ClassCard";
import ClassForm from "../components/ClassForm";
import Modal from "../components/Modal";
import { useDashboardData } from "../layouts/MainLayout";

// Optional: Import icons if you install react-icons
import { FaPlus } from "react-icons/fa";
import {
  deleteClassesData,
  submitClassData,
} from "../services/StandardSchoolsAPIService";

const ClassesPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { dashboardData, isLoading,setIsLoading } = useDashboardData();

  const sessionFromLocalStorage = localStorage.getItem("selectedSession") || "";

  const [selectedSession, setSelectedSession] = useState(
    sessionFromLocalStorage || "2024/2025"
  );

  const availableSessions = dashboardData.sessions;
  const classesData = dashboardData.classes;
  const classTypes = dashboardData.classTypes;

  // Filter classes by selected session
  const filteredClasses = classesData.filter((cls) => {
    // Find the selected session object
    const selectedSessionObj = availableSessions.find(
      (session) => session.name === selectedSession
    );
    // Filter classes that belong to the selected session
    return cls.sessionId == selectedSessionObj?.id;
  });

  // Further filter by search term
  const searchedClasses = filteredClasses.filter(cls =>
    cls.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddClassClick = () => {
    setEditingClass(null);
    setIsModalOpen(true);
  };

  const handleEditClassClick = (classesData) => {
    setEditingClass(classesData);
    setIsModalOpen(true);
  };

  const handleDeleteClass = async (classId) => {
    if (window.confirm("Are you sure you want to delete this class?")) {
      try {
        setIsLoading(true);
        await deleteClassesData(classId);
        toast.success("Class deleted successfully");
        window.location.reload();
      } catch (error) {
        toast.error("Failed to delete class");
        console.error("Error deleting class:", error);
      }
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingClass(null);
  };

  let sessionId = availableSessions.filter(
    (session) => session.name === selectedSession
  )[0]?.id;
  const handleSubmitClass = async (formData) => {
    try {
      formData.sessionId = sessionId;
      setIsLoading(true);
      await submitClassData(formData).then((response) => {
        console.log("response: ", response);
        toast.success(
          editingClass
            ? "Class updated successfully"
            : "Class added successfully"
        );
        closeModal();
        window.location.reload();
      });
    } catch (error) {
      toast.error(
        editingClass ? "Failed to update class" : "Failed to add class"
      );
      console.error("Error submitting class:", error);
    }
    finally {
      setIsLoading(false);
    }
  };

  const handleSessionChange = (sessionName) => {
    localStorage.setItem("selectedSession", sessionName);
    setSelectedSession(sessionName);
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
        <h2 className="text-3xl font-semibold text-gray-800">Classes</h2>
        <button
          onClick={handleAddClassClick}
          className="px-6 py-3 bg-primary-orange text-white font-medium rounded-lg shadow-md hover:bg-opacity-80 transition-colors cursor-pointer flex items-center justify-center space-x-2"
          title="Add New Class"
        >
          <FaPlus className="inline-block" />
          <span>Add New Class</span>
        </button>
      </div>

      {/* Search Field */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search classes by name..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-orange focus:border-primary-orange sm:text-sm"
        />
      </div>

      {/* Session and Term Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <label
            htmlFor="session-filter"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Select Session
          </label>
          <select
            id="session-filter"
            name="session"
            value={selectedSession}
            onChange={(e) => handleSessionChange(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-orange focus:border-primary-orange sm:text-sm cursor-pointer"
          >
            {availableSessions.map((session) => (
              <option key={session.id} value={session.name}>
                {session.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {searchedClasses.length > 0 ? (
          searchedClasses.map((cls) => (
            <ClassCard
              key={cls.id}
              classData={cls}
              onEdit={handleEditClassClick}
              onDelete={handleDeleteClass}
              selectedSession={selectedSession}
            />
          ))
        ) : (
          <div className="col-span-full text-center py-8">
            <p className="text-gray-500 text-lg">
              No classes found for the selected session.
            </p>
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingClass ? "Edit Class" : "Add New Class"}
      >
        <ClassForm
          onSubmit={handleSubmitClass}
          initialData={editingClass}
          classTypes={classTypes}
          selectedSession={selectedSession}
        />
      </Modal>
    </div>
  );
};

export default ClassesPage;
