import axios from 'axios';

const apiUrl =  import.meta.env.VITE_API_URL
const API = axios.create({
  baseURL:  apiUrl
});

let isRefreshing = false;
let refreshSubscribers = [];

API.interceptors.request.use(

  config => {
    
    const userToken = localStorage.getItem('user') === "undefined" ? null : localStorage.getItem('user');
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
    const originalRequest = error.config;

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
      if (!isRefreshing) {
        isRefreshing = true; // Block other requests until refresh completes

        try {
          const refreshToken = JSON.parse(localStorage.getItem('refreshToken'));
          const currentAccessToken = JSON.parse(localStorage.getItem('user'));

          // Refresh token
          const { data } = await axios.post(`${apiUrl}Auth/RefreshToken`, {
            accessToken: currentAccessToken,
            refreshToken: refreshToken
          });

          // Update tokens
          localStorage.setItem('user', JSON.stringify(data.data.accessToken));
          localStorage.setItem('refreshToken', JSON.stringify(data.data.refreshToken));

          // Process queued requests with the new token
          refreshSubscribers.forEach(subscriber => subscriber(data.data.accessToken));
          refreshSubscribers = [];
        } catch (refreshError) {
          // Clear tokens on failure
          localStorage.clear();
          window.location.href = '/';
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      // Return a promise that retries the original request after refresh
      return new Promise((resolve) => {
        refreshSubscribers.push((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          resolve(API(originalRequest));
        });
      });
    }

    // Handle other errors
    //if (error.response) showToast.error("An unexpected error occurred.");
    return Promise.reject(error);
  }
);

export default API;