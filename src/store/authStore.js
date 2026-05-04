import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null, // null | { id, name, role }
  isAuthenticated: false,
  role: null, // 'alumno' | 'admin' | 'superadmin'

  // Simulating authentication for development
  loginAs: (role) => set({ 
    user: { id: 1, name: 'Usuario Prueba', role },
    isAuthenticated: true,
    role 
  }),
  
  logout: () => set({ 
    user: null, 
    isAuthenticated: false, 
    role: null 
  }),
}));
