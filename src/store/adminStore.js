import { create } from 'zustand';
import { db } from '../config/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

export const useAdminStore = create((set) => ({
  usuarios: [],
  usuariosInactivos: [],
  preRegistros: [],
  preRegistrosInactivos: [],
  isLoading: true,
  unsubscribeUsuarios: null,
  unsubscribePreRegistros: null,

  initializeAdminListeners: () => {
    set((state) => {
      if (state.unsubscribeUsuarios) state.unsubscribeUsuarios();
      if (state.unsubscribePreRegistros) state.unsubscribePreRegistros();
      return { isLoading: true };
    });

    const unsubUsuarios = onSnapshot(collection(db, 'usuarios'), (snapshot) => {
      const allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const usersList = allUsers.filter(u => u.estado !== 'inactivo');
      const inactiveUsersList = allUsers.filter(u => u.estado === 'inactivo');
      set({ usuarios: usersList, usuariosInactivos: inactiveUsersList, isLoading: false });
    }, (error) => {
      console.error("Error fetching usuarios:", error);
    });

    const unsubPreRegistros = onSnapshot(collection(db, 'pre_registros'), (snapshot) => {
      const allPre = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const preList = allPre.filter(u => u.estado !== 'inactivo');
      const inactivePreList = allPre.filter(u => u.estado === 'inactivo');
      set({ preRegistros: preList, preRegistrosInactivos: inactivePreList });
    }, (error) => {
      console.error("Error fetching pre_registros:", error);
    });

    set({ 
      unsubscribeUsuarios: unsubUsuarios,
      unsubscribePreRegistros: unsubPreRegistros
    });
  },

  cleanup: () => {
    set((state) => {
      if (state.unsubscribeUsuarios) state.unsubscribeUsuarios();
      if (state.unsubscribePreRegistros) state.unsubscribePreRegistros();
      return {
        usuarios: [],
        usuariosInactivos: [],
        preRegistros: [],
        preRegistrosInactivos: [],
        unsubscribeUsuarios: null,
        unsubscribePreRegistros: null
      };
    });
  }
}));
