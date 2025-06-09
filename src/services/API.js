import axios from 'axios';

const apiUrl =  import.meta.env.VITE_API_URL
const API = axios.create({
  baseURL:  apiUrl
});

let isRefreshing = false;
let refreshSubscribers = [];

API.interceptors.request.use(

  config => {
    
    const userToken = localStorage.getItem('token') === "undefined" ? null : localStorage.getItem('token');
    // Get token from localStorage
    const token = userToken 
      ? JSON.parse(userToken) 
      : null;
      
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Response interceptor
API.interceptors.response.use(
  response => response,
  async error => {

    // // Handle network errors
    // if (error.code === "ERR_NETWORK" || error.message.includes("ERR_CONNECTION_REFUSED")) {
    //   showToast.error("Cannot reach the server at the moment. Please try again later.");
    //   return Promise.reject(error);
    // }

    // // Handle 400 errors
    // if (error.response?.status === 400) {
    //   showToast.error(error.response.data?.data?.message || "Bad request.");
    //   return Promise.reject(error);
    // }

    // if (error.response?.status === 403) {
    //   showToast.error("You do not have permission to access this resource.");
    //   return Promise.reject(error);
    // }

    // Handle 401 Unauthorized (token refresh logic)
    if (error.response?.status === 401) {
      window.location.href = '/login';
    }

    // Handle other errors
    //if (error.response) showToast.error("An unexpected error occurred.");
    return Promise.reject(error);
  }
);

export default API;