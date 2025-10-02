
import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#f0a150', '#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#FF8042'];


// Expanded dummy data for 20+ classes (JSS1A-JSS3D, SSS1A-SSS3D)
const classNames = [
  'JSS1A', 'JSS1B', 'JSS1C', 'JSS1D',
  'JSS2A', 'JSS2B', 'JSS2C', 'JSS2D',
  'JSS3A', 'JSS3B', 'JSS3C', 'JSS3D',
  'SSS1A', 'SSS1B', 'SSS1C', 'SSS1D',
  'SSS2A', 'SSS2B', 'SSS2C', 'SSS2D',
  'SSS3A', 'SSS3B', 'SSS3C', 'SSS3D'
];
const sessions = ['2023/2024', '2024/2025'];
const terms = ['First Term', 'Second Term', 'Third Term'];
const genders = ['Male', 'Female'];

// Generate 200+ students randomly distributed
const dummyStudents = Array.from({ length: 220 }, (_, i) => {
  const classIdx = Math.floor(Math.random() * classNames.length);
  const sessionIdx = Math.floor(Math.random() * sessions.length);
  const termIdx = Math.floor(Math.random() * terms.length);
  const genderIdx = Math.floor(Math.random() * genders.length);
  return {
    id: i + 1,
    name: `Student${i + 1}`,
    gender: genders[genderIdx],
    class: classNames[classIdx],
    session: sessions[sessionIdx],
    term: terms[termIdx],
    feePaid: Math.random() > 0.35 // ~65% paid
  };
});


// 2. Number of students who have paid/unpaid in each class
const feeStatusPerClass = {};
dummyStudents.forEach(s => {
  if (!feeStatusPerClass[s.class]) feeStatusPerClass[s.class] = { class: s.class, paid: 0, unpaid: 0 };
  if (s.feePaid) feeStatusPerClass[s.class].paid += 1;
  else feeStatusPerClass[s.class].unpaid += 1;
});



const DashboardPage = () => {
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');

  // Filter students by session and term
  const filteredStudents = dummyStudents.filter(s =>
    (selectedSession ? s.session === selectedSession : true) &&
    (selectedTerm ? s.term === selectedTerm : true)
  );

  // Recompute metrics based on filtered students
  const studentsPerClass = filteredStudents.reduce((acc, s) => {
    acc[s.class] = (acc[s.class] || 0) + 1;
    return acc;
  }, {});
  const studentsPerClassData = Object.entries(studentsPerClass).map(([name, value]) => ({ class: name, count: value }));

  const feeStatusPerClass = {};
  filteredStudents.forEach(s => {
    if (!feeStatusPerClass[s.class]) feeStatusPerClass[s.class] = { class: s.class, paid: 0, unpaid: 0 };
    if (s.feePaid) feeStatusPerClass[s.class].paid += 1;
    else feeStatusPerClass[s.class].unpaid += 1;
  });
  const feeStatusPerClassData = Object.values(feeStatusPerClass);

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-primary-orange mb-6">Dashboard Metrics</h2>

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
              <option key={session} value={session}>{session}</option>
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
              <option key={term} value={term}>{term}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* Students per Class (Horizontal Bar Chart) */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold mb-4">Number of Students per Class</h3>
          <ResponsiveContainer width="100%" height={studentsPerClassData.length * 22 + 60}>
            <BarChart
              data={studentsPerClassData.sort((a, b) => b.count - a.count)}
              layout="vertical"
              margin={{ left: 60, right: 30, top: 20, bottom: 20 }}
            >
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="class" width={80} />
              <Tooltip formatter={(value) => [`${value} students`, 'Count']} />
              <Bar dataKey="count" fill="#f0a150" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Fee Payment Status per Class (Grouped Horizontal Bar Chart) */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold mb-4">Fee Payment Status per Class</h3>
          <ResponsiveContainer width="100%" height={feeStatusPerClassData.length * 22 + 60}>
            <BarChart
              data={feeStatusPerClassData.sort((a, b) => b.paid + b.unpaid - (a.paid + a.unpaid))}
              layout="vertical"
              margin={{ left: 60, right: 30, top: 20, bottom: 20 }}
            >
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="class" width={80} />
              <Tooltip formatter={(value, name) => [`${value} students`, name.charAt(0).toUpperCase() + name.slice(1)]} />
              <Legend />
              <Bar dataKey="paid" fill="#82ca9d" name="Paid" />
              <Bar dataKey="unpaid" fill="#ff8042" name="Unpaid" />
            </BarChart>
          </ResponsiveContainer>
        </div>

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
