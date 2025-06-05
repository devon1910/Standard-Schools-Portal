import API from "./API";


const apiUrl = import.meta.env.VITE_API_URL;

// Auth
export const getDashboardData = () => API.get(`${apiUrl}genericData`);