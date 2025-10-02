
import React, { useState, useEffect } from 'react';
import { useDashboardData } from '../layouts/MainLayout';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#f0a150', '#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

//data from server structure
// "studentsPerClass": [
//         {
//             "classId": 107,
//             "className": "J.S.S 2B",
//             "studentCount": 6
//         },
//         {
//             "classId": 108,
//             "className": "J.S S.3A",
//             "studentCount": 1
//         },
//         {
//             "classId": 1,
//             "className": "Nursery 1A",
//             "studentCount": 3
//         },
//         {
//             "classId": 111,
//             "className": "S.S.S. 1B",
//             "studentCount": 4
//         },
//     ]

//data from server structure when no filter is selected
//"feePaymentStatusPerClass": [
    //     {
    //         "classId": 107,
    //         "className": "J.S.S 2B",
    //         "firstTermPaid": 4,
    //         "firstTermUnpaid": 2,
    //         "secondTermPaid": 0,
    //         "secondTermUnpaid": 6,
    //         "thirdTermPaid": 0,
    //         "thirdTermUnpaid": 6,
    //         "totalStudents": 6
    //     },
    //     {
    //         "classId": 108,
    //         "className": "J.S S.3A",
    //         "firstTermPaid": 0,
    //         "firstTermUnpaid": 1,
    //         "secondTermPaid": 0,
    //         "secondTermUnpaid": 1,
    //         "thirdTermPaid": 0,
    //         "thirdTermUnpaid": 1,
    //         "totalStudents": 1
    //     },
    //     {
    //         "classId": 1,
    //         "className": "Nursery 1A",
    //         "firstTermPaid": 2,
    //         "firstTermUnpaid": 1,
    //         "secondTermPaid": 0,
    //         "secondTermUnpaid": 3,
    //         "thirdTermPaid": 0,
    //         "thirdTermUnpaid": 3,
    //         "totalStudents": 3
    //     },
    // ]

    //structure when term filter is selected
    //"feePaymentStatusPerClass": [
    //     {
    //         "classId": 107,
    //         "className": "J.S.S 2B",
    //         "paidCount: 3",
     //           "unpaidCount": 3,
    //         "totalStudents": 6
    //     },
    //     {
    //         "classId": 108,
    //         "className": "J.S S.3A",
    //         "paidCount: 5"
     //           "unpaidCount": 5,
    //         "totalStudents": 10
    //     },
    //    
    // ]



const DashboardPage = () => {
  const { dashboardData, filters, updateFilters, refetchData, isLoading } = useDashboardData();
  const sessions = dashboardData.sessions || [];
  const terms = dashboardData.terms || [];
  const studentsPerClassData = dashboardData.studentsPerClass || [];
  const feeStatusPerClassData = dashboardData.feePaymentStatusPerClass || [];

  // Local state for filters
  const [selectedSession, setSelectedSession] = useState(filters.sessionId || '');
  const [selectedTerm, setSelectedTerm] = useState(filters.termId || '');

  // When filter changes, update context and refetch
  useEffect(() => {
    updateFilters({ sessionId: selectedSession, termId: selectedTerm });
    refetchData({ sessionId: selectedSession, termId: selectedTerm });
    // eslint-disable-next-line
  }, [selectedSession, selectedTerm]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-primary-orange"></div>
      </div>
    );
  }
  // Calculate totals
  const totalStudents = studentsPerClassData.reduce((sum, c) => sum + (c.studentCount || 0), 0);
  let totalPaid = 0;
  let totalUnpaid = 0;
  if (selectedTerm) {
    // When term is selected, use paidCount/unpaidCount
    totalPaid = feeStatusPerClassData.reduce((sum, c) => sum + (c.paidCount || 0), 0);
    totalUnpaid = feeStatusPerClassData.reduce((sum, c) => sum + (c.unpaidCount || 0), 0);
  } else {
    // When no term is selected, sum all paid/unpaid for all terms
    totalPaid = feeStatusPerClassData.reduce((sum, c) => sum + ((c.firstTermPaid || 0) + (c.secondTermPaid || 0) + (c.thirdTermPaid || 0)), 0);
    totalUnpaid = feeStatusPerClassData.reduce((sum, c) => sum + ((c.firstTermUnpaid || 0) + (c.secondTermUnpaid || 0) + (c.thirdTermUnpaid || 0)), 0);
  }

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-primary-orange mb-6">Dashboard Metrics</h2>

      {/* Summary Totals */}
      <div className="flex flex-wrap gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-4 min-w-[180px]">
          <div className="text-gray-500 text-xs mb-1">Total Students</div>
          <div className="text-2xl font-bold text-primary-orange">{totalStudents}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 min-w-[180px]">
          <div className="text-gray-500 text-xs mb-1">Total Paid{selectedTerm ? '' : ' (All Terms)'}</div>
          <div className="text-2xl font-bold text-green-600">{totalPaid}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 min-w-[180px]">
          <div className="text-gray-500 text-xs mb-1">Total Unpaid{selectedTerm ? '' : ' (All Terms)'}</div>
          <div className="text-2xl font-bold text-red-500">{totalUnpaid}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Session</label>
          <select
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-orange focus:border-primary-orange sm:text-sm"
            value={selectedSession}
            onChange={e => setSelectedSession(e.target.value)}
          >
            <option value="">All Sessions</option>
            {sessions.map(session => (
              <option key={session.id || session} value={session.id || session}>{session.name || session}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Term</label>
          <select
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-orange focus:border-primary-orange sm:text-sm"
            value={selectedTerm}
            onChange={e => setSelectedTerm(e.target.value)}
          >
            <option value="">All Terms</option>
            {terms.map(term => (
              <option key={term.id || term} value={term.id || term}>{term.name || term}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* Students per Class (Horizontal Bar Chart) */}

        {studentsPerClassData.length > 0 && <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold mb-4">Number of Students per Class</h3>
          <ResponsiveContainer width="100%" height={studentsPerClassData.length * 22 + 60}>
            <BarChart
              data={studentsPerClassData.slice().sort((a, b) => b.studentCount - a.studentCount)}
              layout="vertical"
              margin={{ left: 60, right: 30, top: 20, bottom: 20 }}
            >
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="className" width={120} />
              <Tooltip formatter={(value) => [`${value} students`, 'Count']} />
              <Bar dataKey="studentCount" fill="#f0a150" />
            </BarChart>
          </ResponsiveContainer>
        </div> }
        

        {/* Fee Payment Status per Class (Grouped Horizontal Bar Chart) */}
         {feeStatusPerClassData.length > 0 &&
           <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold mb-4">Fee Payment Status per Class</h3>
          <ResponsiveContainer width="100%" height={feeStatusPerClassData.length * 22 + 60}>
            <BarChart
              data={feeStatusPerClassData.slice()}
              layout="vertical"
              margin={{ left: 60, right: 30, top: 20, bottom: 20 }}
            >
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="className" width={120} />
              <Tooltip />
              <Legend />
              {/* If term filter is selected, use paidCount/unpaidCount, else show all terms */}
              {selectedTerm
                ? [
                    <Bar key="paid" dataKey="paidCount" fill="#82ca9d" name="Paid" />,
                    <Bar key="unpaid" dataKey="unpaidCount" fill="#ff8042" name="Unpaid" />
                  ]
                : [
                    <Bar key="firstTermPaid" dataKey="firstTermPaid" fill="#82ca9d" name="First Term Paid" />,
                    <Bar key="firstTermUnpaid" dataKey="firstTermUnpaid" fill="#ff8042" name="First Term Unpaid" />,
                    <Bar key="secondTermPaid" dataKey="secondTermPaid" fill="#0088FE" name="Second Term Paid" />,
                    <Bar key="secondTermUnpaid" dataKey="secondTermUnpaid" fill="#FFBB28" name="Second Term Unpaid" />,
                    <Bar key="thirdTermPaid" dataKey="thirdTermPaid" fill="#00C49F" name="Third Term Paid" />,
                    <Bar key="thirdTermUnpaid" dataKey="thirdTermUnpaid" fill="#8884d8" name="Third Term Unpaid" />
                  ]}
            </BarChart>
          </ResponsiveContainer>
        </div>
        }
       

        {/* Question Bank: Records per Session */}
        {/* <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold mb-4">Question Bank Records per Session</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={questionsPerSessionData}>
              <XAxis dataKey="session" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold mb-4">Question Bank Records per Term & Session</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={questionsPerTermData}>
              <XAxis dataKey={"term"} tickFormatter={(v, i) => `${questionsPerTermData[i].term} (${questionsPerTermData[i].session})`} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#00C49F" />
            </BarChart>
          </ResponsiveContainer>
        </div> */}
      </div>
    </div>
  );
};

export default DashboardPage;
