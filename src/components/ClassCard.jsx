import React from 'react';
import { Link } from 'react-router-dom';

import { FaEye, FaEdit, FaTrashAlt } from 'react-icons/fa';

const ClassCard = ({ classData, onEdit, onDelete, selectedSession, selectedTerm }) => {

  const {id, name, classTeacher, classTypeId} = classData
  return (
    <div className="bg-gray-50 rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow duration-200">
      <h3 className="text-xl font-semibold text-gray-800 mb-2">{name}</h3>
      <p className="text-gray-600 mb-4">Class Teacher: {classTeacher || 'N/A'}</p>
      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 mt-4">
        {/* View Students Button */}
        <Link
          to={`/students?session=${selectedSession}&class=${classData.name}`}
          className="flex-grow text-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors cursor-pointer flex items-center justify-center space-x-1"
          title="View Students"
        >
          <FaEye className="inline-block" />
          <span>View Students</span>
        </Link>
        {/* Edit Button */}
        <button
          onClick={() => onEdit(classData)}
          className="flex-grow text-center px-4 py-2 bg-primary-orange text-white rounded hover:bg-opacity-80 transition-colors cursor-pointer flex items-center justify-center space-x-1"
          title="Edit Class"
        >
          <FaEdit className="inline-block" />
          <span>Edit</span>
        </button>
        
      </div>
    </div>
  );
};

export default ClassCard;