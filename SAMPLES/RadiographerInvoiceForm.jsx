import React, { useState } from 'react';

const RadiographerInvoiceForm = () => {
  const [patientName, setPatientName] = useState('');
  const [dateOfExam, setDateOfExam] = useState(new Date().toLocaleDateString());
  
  return (
    <div className="w-full max-w-md p-6 mx-auto bg-white rounded-lg shadow-lg">
      <h1 className="mb-4 text-xl font-bold">Radiographer Invoice Form</h1>
      
      {/* Patient Name */}
      <label htmlFor="patientName" className="block text-sm font-medium text-gray-700">Patient Name:</label>
      <input
        type="text"
        id="patientName"
        value={patientName}
        onChange={(e) => setPatientName(e.target.value)}
        className="block w-full px-3 py-2 mt-1 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
      />
      
      {/* Date of Exam */}
      <label htmlFor="dateOfExam" className="block mt-4 text-sm font-medium text-gray-700">Date of Exam:</label>
      <input
        type="text"
        id="dateOfExam"
        value={dateOfExam}
        onChange={(e) => setDateOfExam(e.target.value)}
        className="block w-full px-3 py-2 mt-1 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
      />
      
      {/* Add more form fields as needed */}
    </div>
  );
};

export default RadiographerInvoiceForm;