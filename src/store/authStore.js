import { create } from 'zustand';
import { auth, db } from '../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { loginWithGoogle, logout as logoutFirebase, loginWithEmail as loginEmailService, registerWithEmail as registerEmailService, resetPassword as resetPasswordService } from '../services/authService';
import { useAdminStore } from './adminStore';

export const useAuthStore = create((set) => ({
  user: null, // null | { uid, nombre, email, role }
  isAuthenticated: false,
  role: null, // 'alumno' | 'admin' | 'superadmin'
  userData: null, // Real-time user document data
  isInitializing: true, // Para mostrar un loading mientras Firebase revisa la sesión
  unsubscribeSnapshot: null, // Store the unsubscribe function

  initializeAuth: () => {
    onAuthStateChanged(auth, async (firebaseUser) => {
      // Clear previous snapshot listener if exists
      set((state) => {
        if (state.unsubscribeSnapshot) {
          state.unsubscribeSnapshot();
        }
        return { unsubscribeSnapshot: null };
      });

      if (firebaseUser) {
        // Buscar el rol en Firestore
        const userRef = doc(db, 'usuarios', firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        const role = userSnap.exists() ? (userSnap.data().rol || 'alumno') : 'alumno';

        // Set up real-time listener for user data
        const unsubscribe = onSnapshot(userRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.estado === 'inactivo') {
              alert("Tu cuenta ha sido dada de baja o archivada. Serás desconectado.");
              useAuthStore.getState().logout();
              return;
            }
            set({ userData: data });
          }
        });

        set({
          user: {
            uid: firebaseUser.uid,
            nombre: firebaseUser.displayName,
            email: firebaseUser.email,
            role: role
          },
          userData: userSnap.exists() ? userSnap.data() : null,
          isAuthenticated: true,
          role: role,
          isInitializing: false,
          unsubscribeSnapshot: unsubscribe
        });

        if (role === 'admin' || role === 'superadmin') {
          useAdminStore.getState().initializeAdminListeners();
        }
      } else {
        set({
          user: null,
          userData: null,
          isAuthenticated: false,
          role: null,
          isInitializing: false
        });
      }
    });
  },

  login: async () => {
    const userData = await loginWithGoogle();
    set({
      user: userData,
      isAuthenticated: true,
      role: userData.role
    });
  },

  loginWithEmail: async (email, password, rememberMe) => {
    const userData = await loginEmailService(email, password, rememberMe);
    set({
      user: userData,
      isAuthenticated: true,
      role: userData.role
    });
  },

  registerWithEmail: async (email, password, nombre) => {
    const userData = await registerEmailService(email, password, nombre);
    set({
      user: userData,
      isAuthenticated: true,
      role: userData.role
    });
  },
  
  logout: async () => {
    await logoutFirebase();
    useAdminStore.getState().cleanup();
    set((state) => {
      if (state.unsubscribeSnapshot) {
        state.unsubscribeSnapshot();
      }
      return { 
        user: null, 
        userData: null,
        isAuthenticated: false, 
        role: null,
        unsubscribeSnapshot: null
      };
    });
  },

  sendPasswordReset: async (email) => {
    try {
      await resetPasswordService(email);
      return true;
    } catch (error) {
      throw error;
    }
  }
}));
