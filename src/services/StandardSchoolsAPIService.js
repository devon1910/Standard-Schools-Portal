import API from "./API";


const apiUrl = import.meta.env.VITE_API_URL;

export const getDashboardData = () => API.get(`${apiUrl}genericData`);

export const submitQuestionData = (formData) => API.post(`${apiUrl}questions`, formData);

export const deleteQuestionData = (id) => API.delete(`${apiUrl}questions/${id}`);