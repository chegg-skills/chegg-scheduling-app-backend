import axios from 'axios'

export const getBaseURL = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (!envUrl) return '/api';
  return envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`;
};


const apiClient = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

// Redirect to login on 401 without creating a circular dependency on AuthContext
apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      const pathname = window.location.pathname
      const isPublicRoute =
        pathname.startsWith('/login') ||
        pathname.startsWith('/register') ||
        pathname.startsWith('/bootstrap') ||
        pathname.startsWith('/accept-invite') ||
        pathname.startsWith('/book') ||
        pathname.startsWith('/reschedule')

      if (!isPublicRoute) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

export default apiClient
