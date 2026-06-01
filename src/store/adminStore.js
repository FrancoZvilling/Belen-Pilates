import { create } from 'zustand';
import { db } from '../config/firebase';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { ejecutarBarridoInasistencias } from '../services/turnosService';

let hasSwept = false;

export const useAdminStore = create((set) => ({
  usuarios: [],
  usuariosInactivos: [],
  preRegistros: [],
  preRegistrosInactivos: [],
  pagosHistorial: [],
  precios: { plan_8_clases: 15000, plan_12_clases: 20000 },
  isLoading: true,
  unsubscribeUsuarios: null,
  unsubscribePreRegistros: null,
  unsubscribePagos: null,
  unsubscribePrecios: null,

  initializeAdminListeners: () => {
    set((state) => {
      if (state.unsubscribeUsuarios) state.unsubscribeUsuarios();
      if (state.unsubscribePreRegistros) state.unsubscribePreRegistros();
      if (state.unsubscribePagos) state.unsubscribePagos();
      if (state.unsubscribePrecios) state.unsubscribePrecios();
      return { isLoading: true };
    });

    const unsubUsuarios = onSnapshot(collection(db, 'usuarios'), (snapshot) => {
      const allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const usersList = allUsers.filter(u => u.estado !== 'inactivo');
      const inactiveUsersList = allUsers.filter(u => u.estado === 'inactivo');
      
      set({ usuarios: usersList, usuariosInactivos: inactiveUsersList, isLoading: false });

      if (!hasSwept && usersList.length > 0) {
        hasSwept = true;
        ejecutarBarridoInasistencias(db, usersList);
      }
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

    const unsubPagos = onSnapshot(collection(db, 'pagos_historial'), (snapshot) => {
      const pagos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      set({ pagosHistorial: pagos });
    }, (error) => {
      console.error("Error fetching pagos_historial:", error);
    });

    const unsubPrecios = onSnapshot(doc(db, 'configuracion', 'precios'), (docSnap) => {
      if (docSnap.exists()) {
        set({ precios: docSnap.data() });
      }
    }, (error) => {
      console.error("Error fetching precios:", error);
    });

    set({ 
      unsubscribeUsuarios: unsubUsuarios,
      unsubscribePreRegistros: unsubPreRegistros,
      unsubscribePagos: unsubPagos,
      unsubscribePrecios: unsubPrecios
    });
  },

  cleanup: () => {
    set((state) => {
      if (state.unsubscribeUsuarios) state.unsubscribeUsuarios();
      if (state.unsubscribePreRegistros) state.unsubscribePreRegistros();
      if (state.unsubscribePagos) state.unsubscribePagos();
      if (state.unsubscribePrecios) state.unsubscribePrecios();
      return {
        usuarios: [],
        usuariosInactivos: [],
        preRegistros: [],
        preRegistrosInactivos: [],
        pagosHistorial: [],
        unsubscribeUsuarios: null,
        unsubscribePreRegistros: null,
        unsubscribePagos: null,
        unsubscribePrecios: null
      };
    });
  }
}));
