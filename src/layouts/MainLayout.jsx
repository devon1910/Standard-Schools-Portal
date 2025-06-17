import React, { useState, useEffect, createContext, useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getDashboardData } from '../services/StandardSchoolsAPIService';
import { FiLogOut } from 'react-icons/fi';

// Create Context for Dashboard Data
const DashboardContext = createContext();

// Custom hook to use dashboard context
export const useDashboardData = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboardData must be used within a DashboardProvider');
  }
  return context;
};

const MainLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Navigation state
  const [activeTab, setActiveTab] = useState(location.pathname.split('/')[1] || 'questions');

  // Dashboard data state
  const [isLoading, setIsLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    sessions: [],
    classes: [],
    terms: [],
    subjects: [],
    classTypes: [],
    questions: {
      items: [],
      totalRecords: 0,
      totalPages: 0
    }
  });

  // Filter state
  const [filters, setFilters] = useState({
    sessionId: '',
    termId: '',
    classId: '',
    questionType: '',
    page: 1,
    pageSize: 10
  });

  const availableQuestionType = [
    { id: 0, name: 'CA' },
    { id: 1, name: 'Exam' }
  ];

  // Update activeTab when location changes
  useEffect(() => {
    const path = location.pathname.split('/')[1];
    if (path) {
      setActiveTab(path);
    } else {
      setActiveTab('questions');
    }
  }, [location.pathname]);

  // Centralized API call function with debouncing
  const fetchDashboardData = async (customFilters = null) => {
    setIsLoading(true);
    
    const apiFilters = customFilters || {
      sessionId: filters.sessionId || null,
      termId: filters.termId || null,
      classId: filters.classId || null,
      questionType: filters.questionType ? 
        availableQuestionType[parseInt(filters.questionType)].name : null,
      page: filters.page,
      pageSize: filters.pageSize
    };

    try {
      const response = await getDashboardData(apiFilters);
      const data = response.data;
      
      setDashboardData({
        sessions: data.sessions || [],
        classes: data.classes || [],
        terms: data.terms || [],
        subjects: data.subjects || [],
        classTypes: data.classTypes || [],
        questions: {
          items: data.questions.items || data.questions || [],
          totalRecords: data.questions.totalRecords || data.questions.length || 0,
          totalPages: data.questions.totalPages || 
            Math.ceil((data.questions.length || 0) / apiFilters.pageSize)
        }
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Combined effect for all filter changes and initial load
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchDashboardData();
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [
    filters.sessionId,
    filters.termId,
    filters.classId,
    filters.questionType,
    filters.page
  ]);

  // Filter update functions
  const updateFilters = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const clearAllFilters = () => {
    const clearedFilters = {
      sessionId: '',
      termId: '',
      classId: '',
      questionType: '',
      page: 1,
      pageSize: 10
    };
    setFilters(clearedFilters);
  };

  // Context value
  const contextValue = {
    // Data
    dashboardData,
    availableQuestionType,
    
    // Loading state
    isLoading,
    setIsLoading,
    
    // Filters
    filters,
    updateFilters,
    clearAllFilters,
    
    // Functions
    refetchData: fetchDashboardData,
    
    // Computed values
    getFilterDisplayNames: () => {
      const sessionName = dashboardData.sessions.find(s => 
        s.id.toString() === filters.sessionId)?.name || filters.sessionId;
      const termName = dashboardData.terms.find(t => 
        t.id.toString() === filters.termId)?.name || filters.termId;
      const className = dashboardData.classes.find(c => 
        c.id.toString() === filters.classId)?.name || filters.classId;
      const typeName = availableQuestionType.find(t => 
        t.id.toString() === filters.questionType)?.name || filters.questionType;
      
      return { sessionName, termName, className, typeName };
    }
  };

  const navItems = [
    { name: 'Questions Bank', path: '/questions', id: 'questions' },
    { name: 'Classes', path: '/classes', id: 'classes' },
    { name: 'Sessions', path: '/sessions', id: 'sessions' },
  ];

  const handleLogout = () => {
    if(window.confirm('Are you sure you want to logout?')) {
      localStorage.removeItem('token');
      toast.success('Logged out successfully');
      navigate('/login');
    }
  };
   const schoolName=localStorage.getItem("schoolId") === "1" ? "Standard High School" : "Standard International College";

   console.log("schoolName", localStorage.getItem("schoolId"));
  return (
    <DashboardContext.Provider value={contextValue}>
      <div className="min-h-screen flex flex-col bg-light-background text-black">
        <header className="bg-white shadow-md p-4">
          <nav className="container mx-auto flex justify-between items-center">
            <h1 className="text-2xl font-bold text-primary-orange">{schoolName}</h1>
            <div className="flex items-center space-x-4">
              <ul className="flex space-x-4">
                {navItems.map((item) => (
                  <li key={item.id}>
                    <Link
                      to={item.path}
                      onClick={() => setActiveTab(item.id)}
                      className={`px-4 py-2 rounded-md transition-colors duration-200 ${
                        activeTab === item.id
                          ? 'bg-primary-orange text-white'
                          : 'text-black hover:bg-gray-100'
                      } cursor-pointer`}
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors duration-200 flex items-center space-x-2"
              >
                <FiLogOut className="inline-block" />
                <span>Logout</span>
              </button>
            </div>
          </nav>
        </header>
        <main className="flex-grow container mx-auto p-4 py-8">
          {children}
        </main>
        <footer className="bg-white shadow-inner p-4 text-center text-gray-600">
          &copy; {new Date().getFullYear()} School Portal. All rights reserved.
        </footer>
      </div>
    </DashboardContext.Provider>
  );
};

export default MainLayout;