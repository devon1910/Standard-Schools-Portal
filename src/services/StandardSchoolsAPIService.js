import API from "./API";

const apiUrl = import.meta.env.VITE_API_URL;

export const getDashboardData = (filters={}) => {
     const params = new URLSearchParams();
        
        if (filters.sessionId) {
            params.append('sessionId', filters.sessionId);
        }
        if (filters.termId) {
            params.append('termId', filters.termId);
        }
        if (filters.classId) {
            params.append('classId', filters.classId);
        }
        if (filters.questionType) {
            params.append('questionType', filters.questionType);
        }
        if (filters.page) {
            params.append('page', filters.page);
        }
        if (filters.pageSize) {
            params.append('pageSize', filters.pageSize);
        }
        
        const queryString = params.toString();
        return API.get(`${apiUrl}genericData${queryString ? `?${queryString}` : ''}`);
} 
export const submitQuestionData = (formData) => API.post(`${apiUrl}questions`, formData);

export const submitClassData = (formData) => API.post(`${apiUrl}classes`, formData);

export const submitStudentData = (formData) => API.post(`${apiUrl}students`, formData);

export const submitSessionData = (formData) => API.post(`${apiUrl}sessions`, formData);

export const loginLogic = (formData) => API.post(`${apiUrl}login`, formData);

export const deleteSessionData = (id) => API.delete(`${apiUrl}sessions/${id}`);
export const deleteQuestionData = (id) => API.delete(`${apiUrl}questions/${id}`);
export const deleteClassesData = (id) => API.delete(`${apiUrl}classes/${id}`);
export const deleteStudentData = (id) => API.delete(`${apiUrl}students/${id}`);

export const getStudentsData = (sessionId,classId) => API.get(`${apiUrl}students?sessionId=${sessionId}&classId=${classId}`); //API.get(`${apiUrl}students?termId=${termId}&classId=${classId}&sessionId=${sessionId}`);
