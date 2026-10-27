// import { create } from 'zustand'
// import { persist } from 'zustand/middleware'
// import axios from 'axios'

// //const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
// const API_URL = 'http://192.168.70.123:8000/api/v1'
// const api = axios.create({
//   baseURL: API_URL,
//   headers: {
//     'Content-Type': 'application/json'
//   }
// })

// // Add auth token to requests
// api.interceptors.request.use((config) => {
//   const token = localStorage.getItem('token')
//   if (token) {
//     config.headers.Authorization = `Bearer ${token}`
//   }
//   return config
// })

// // Handle token expiration
// api.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     if (error.response?.status === 401) {
//       localStorage.removeItem('token')
//       window.location.href = '/login'
//     }
//     return Promise.reject(error)
//   }
// )

// export { api }

// export const useAuthStore = create(
//   persist(
//     (set, get) => ({
//       user: null,
//       isAuthenticated: false,
//       isLoading: false,
//       error: null,

//       login: async (email, password) => {
//         set({ isLoading: true, error: null })
//         try {
//           const formData = new FormData()
//           formData.append('username', email)
//           formData.append('password', password)

//           const response = await api.post('/auth/login', formData, {
//             headers: { 'Content-Type': 'multipart/form-data' }
//           })

//           const { access_token, user } = response.data
//           localStorage.setItem('token', access_token)

//           set({ 
//             user, 
//             isAuthenticated: true, 
//             isLoading: false 
//           })
//           return true
//         } catch (error) {
//           set({ 
//             error: error.response?.data?.detail || 'Erreur de connexion',
//             isLoading: false 
//           })
//           return false
//         }
//       },

//       logout: () => {
//         localStorage.removeItem('token')
//         set({ user: null, isAuthenticated: false, error: null })
//       },

//       fetchUser: async () => {
//         try {
//           const response = await api.get('/auth/me')
//           set({ user: response.data, isAuthenticated: true })
//         } catch (error) {
//           set({ user: null, isAuthenticated: false })
//         }
//       },

//       updateProfile: async (data) => {
//         try {
//           const response = await api.put(`/users/${get().user.id}`, data)
//           set({ user: response.data })
//           return true
//         } catch (error) {
//           return false
//         }
//       }
//     }),
//     {
//       name: 'auth-storage',
//       partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated })
//     }
//   )
// )
///////////
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import axios from 'axios'

const API_URL ='http://127.0.0.1:8000/api/v1' 

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export { api }

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      login: async (email, password) => {
        set({ isLoading: true, error: null })
        try {
          const formData = new FormData()
          formData.append('username', email)
          formData.append('password', password)
          const response = await api.post('/auth/login', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          })
          const { access_token, user } = response.data
          localStorage.setItem('token', access_token)
          set({ user, isAuthenticated: true, isLoading: false })
          return true
        } catch (error) {
          set({ error: error.response?.data?.detail || 'Erreur de connexion', isLoading: false })
          return false
        }
      },
      logout: () => {
        localStorage.removeItem('token')
        set({ user: null, isAuthenticated: false, error: null })
      },
      fetchUser: async () => {
        try {
          const response = await api.get('/auth/me')
          set({ user: response.data, isAuthenticated: true })
        } catch (error) {
          set({ user: null, isAuthenticated: false })
        }
      },
      updateProfile: async (data) => {
        try {
          const response = await api.put(`/users/${get().user.id}`, data)
          set({ user: response.data })
          return true
        } catch (error) {
          return false
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated })
    }
  )
)