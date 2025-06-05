import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom'; // Import useLocation to auto-set active tab

const MainLayout = ({ children }) => {
  const location = useLocation();
  // Determine active tab based on current path
  const [activeTab, setActiveTab] = useState(location.pathname.split('/')[1] || 'questions');

  // Update activeTab when location changes
  React.useEffect(() => {
    const path = location.pathname.split('/')[1];
    if (path) {
      setActiveTab(path);
    } else {
      setActiveTab('questions'); // Default if root path
    }
  }, [location.pathname]);


  const navItems = [
    { name: 'Questions Bank', path: '/questions', id: 'questions' },
    { name: 'Classes', path: '/classes', id: 'classes' },
    { name: 'Sessions', path: '/sessions', id: 'sessions' }, // New Nav Item
  ];

  return (
    <div className="min-h-screen flex flex-col bg-light-background text-black">
      <header className="bg-white shadow-md p-4">
        <nav className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary-orange">School High School Portal</h1>
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
        </nav>
      </header>
      <main className="flex-grow container mx-auto p-4 py-8">
        {children}
      </main>
      <footer className="bg-white shadow-inner p-4 text-center text-gray-600">
        &copy; {new Date().getFullYear()} School Portal. All rights reserved.
      </footer>
    </div>
  );
};

export default MainLayout;