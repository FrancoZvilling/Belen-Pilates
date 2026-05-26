import { auth, db } from '../config/firebase';
import { GoogleAuthProvider, signInWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, setPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';

const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    const emailId = user.email.trim().toLowerCase();

    // Verificar si el usuario ya existe en Firestore
    const userRef = doc(db, 'usuarios', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      // Si es un usuario nuevo, BUSCAR EN PRE_REGISTROS
      const preRegistroRef = doc(db, 'pre_registros', emailId);
      const preRegistroSnap = await getDoc(preRegistroRef);

      if (!preRegistroSnap.exists()) {
        // No está en la lista de invitados. Borrar la cuenta que Google acaba de crear
        await user.delete();
        await signOut(auth);
        const error = new Error('not-invited');
        error.code = 'custom/not-invited';
        throw error;
      }

      const preData = preRegistroSnap.data();

      // Si está, creamos su perfil real con los datos pre-cargados
      await setDoc(userRef, {
        nombre: preData.nombre || user.displayName,
        email: emailId,
        telefono: preData.telefono || '',
        rol: 'alumno',
        plan: preData.plan || 8,
        clases_restantes: preData.plan || 8,
        turnos_fijos: preData.turnosFijos || [],
        estado: 'activo',
        fecha_registro: new Date().toISOString()
      });

      // Borrar el ticket de pre-registro
      await deleteDoc(preRegistroRef);

      return {
        uid: user.uid,
        nombre: preData.nombre || user.displayName,
        email: emailId,
        role: 'alumno'
      };
      // Si ya existe en usuarios, verificamos que no esté inactivo
      const userData = userSnap.data();
      if (userData.estado === 'inactivo') {
        await signOut(auth);
        throw new Error('Esta cuenta ha sido desactivada por el administrador.');
      }

      return {
        uid: user.uid,
        nombre: user.displayName || userData.nombre,
        email: emailId,
        role: userData.rol || 'alumno'
      };
    }
  } catch (error) {
    console.error("Error en login con Google:", error);
    throw error;
  }
};

export const configurePersistence = async (rememberMe) => {
  try {
    await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
  } catch (error) {
    console.error("Error setting persistence:", error);
  }
};

export const loginWithEmail = async (email, password, rememberMe) => {
  try {
    await configurePersistence(rememberMe);
    const result = await signInWithEmailAndPassword(auth, email, password);
    const user = result.user;

    const userRef = doc(db, 'usuarios', user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();
      if (userData.estado === 'inactivo') {
        await signOut(auth);
        throw new Error('Esta cuenta ha sido desactivada por el administrador.');
      }
    }

    const role = userSnap.exists() ? (userSnap.data().rol || 'alumno') : 'alumno';

    return {
      uid: user.uid,
      nombre: user.displayName || email.split('@')[0],
      email: user.email,
      role: role
    };
  } catch (error) {
    console.error("Error en login con Email:", error);
    throw error;
  }
};

export const registerWithEmail = async (email, password, nombre) => {
  try {
    const emailId = email.trim().toLowerCase();

    // 1. Verificamos SIEMPRE primero en pre_registros ANTES de crear el usuario de Auth
    const preRegistroRef = doc(db, 'pre_registros', emailId);
    const preRegistroSnap = await getDoc(preRegistroRef);

    if (!preRegistroSnap.exists()) {
      const error = new Error('not-invited');
      error.code = 'custom/not-invited';
      throw error;
    }

    const preData = preRegistroSnap.data();

    // 2. Si está invitado, le creamos la cuenta en Authentication
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const user = result.user;

    // 3. Crear usuario en Firestore
    const userRef = doc(db, 'usuarios', user.uid);
    await setDoc(userRef, {
      nombre: nombre || preData.nombre,
      email: emailId,
      telefono: preData.telefono || '',
      rol: 'alumno',
      plan: preData.plan || 8,
      clases_restantes: preData.plan || 8,
      turnos_fijos: preData.turnosFijos || [],
      estado: 'activo',
      fecha_registro: new Date().toISOString()
    });

    // 4. Borrar el pre-registro
    await deleteDoc(preRegistroRef);

    return {
      uid: user.uid,
      nombre: nombre || preData.nombre,
      email: emailId,
      role: 'alumno'
    };
  } catch (error) {
    console.error("Error en registro con Email:", error);
    throw error;
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error cerrar sesión:", error);
    throw error;
  }
};

/**
 * Archiva (Soft Delete) a un usuario o pre-registro.
 */
export const archivarUsuario = async (db, uid, isPreRegistro = false) => {
  const colName = isPreRegistro ? 'pre_registros' : 'usuarios';
  const ref = doc(db, colName, uid);
  try {
    await updateDoc(ref, { estado: 'inactivo' });
    return { success: true };
  } catch (error) {
    console.error("Error archivando usuario:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Reactiva a un usuario archivado.
 */
export const reactivarUsuario = async (db, uid, isPreRegistro = false) => {
  const colName = isPreRegistro ? 'pre_registros' : 'usuarios';
  const ref = doc(db, colName, uid);
  try {
    await updateDoc(ref, { estado: 'activo' });
    return { success: true };
  } catch (error) {
    console.error("Error reactivando usuario:", error);
    return { success: false, error: error.message };
  }
};
