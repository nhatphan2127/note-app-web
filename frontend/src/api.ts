import axios from 'axios';

const api = axios.create({
    baseURL: `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api`,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Prevent debugger from stopping on expected network errors during offline mode
        if (!navigator.onLine || error.code === 'ERR_NETWORK') {
            console.warn('Network error detected. App is likely offline.', error.message);
        }
        return Promise.reject(error);
    }
);

export default api;
