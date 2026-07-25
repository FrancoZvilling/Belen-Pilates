import { auth, db } from '../config/firebase';
import { GoogleAuthProvider, signInWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, setPersistence, browserLocalPersistence, browserSessionPersistence, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { crearNotificacion } from './notificacionesService';

const googleProvider = new GoogleAuthProvider();

export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return true;
  } catch (error) {
    console.error("Error sending password reset email", error);
    throw error;
  }
};

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
      const rolAsignado = preData.rol || 'alumno';

      // Si está, creamos su perfil real con los datos pre-cargados
      const userDocData = {
        nombre: preData.nombre || user.displayName,
        email: emailId,
        telefono: preData.telefono || '',
        rol: rolAsignado,
        estado: 'activo',
        fecha_registro: new Date().toISOString()
      };

      // Solo los alumnos tienen plan, clases y turnos
      if (rolAsignado === 'alumno') {
        userDocData.plan = preData.plan || 8;
        userDocData.clases_restantes = 0;
        userDocData.turnos_fijos = preData.turnosFijos || [];
      }

      await setDoc(userRef, userDocData);

      // Borrar el ticket de pre-registro
      await deleteDoc(preRegistroRef);

      // Enviar notificación al administrador si es un alumno nuevo
      if (rolAsignado === 'alumno') {
        const nombreAlumno = preData.nombre || user.displayName;
        await crearNotificacion(
          db, 
          'admin', 
          'nuevo_alumno', 
          'Nuevo alumno registrado', 
          `${nombreAlumno} se ha registrado como alumno.`
        );
      }

      return {
        uid: user.uid,
        nombre: preData.nombre || user.displayName,
        email: emailId,
        role: rolAsignado
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

    if (!userSnap.exists()) {
      // Auto-reparación: Si el documento de usuario no existe pero pudo iniciar sesión,
      // probablemente hubo un error al registrarse. Buscamos en pre_registros.
      const emailId = email.trim().toLowerCase();
      const preRegistroRef = doc(db, 'pre_registros', emailId);
      const preRegistroSnap = await getDoc(preRegistroRef);

      if (preRegistroSnap.exists()) {
        const preData = preRegistroSnap.data();
        const rolAsignado = preData.rol || 'alumno';

        const userDocData = {
          nombre: preData.nombre || user.displayName || email.split('@')[0],
          email: emailId,
          telefono: preData.telefono || '',
          rol: rolAsignado,
          estado: 'activo',
          fecha_registro: new Date().toISOString()
        };

        if (rolAsignado === 'alumno') {
          userDocData.plan = preData.plan || 8;
          userDocData.clases_restantes = 0;
          userDocData.turnos_fijos = preData.turnos_fijos || preData.turnosFijos || [];
        }

        await setDoc(userRef, userDocData);
        await deleteDoc(preRegistroRef);

        if (rolAsignado === 'alumno') {
          await crearNotificacion(
            db, 
            'admin', 
            'nuevo_alumno', 
            'Nuevo alumno registrado', 
            `${userDocData.nombre} se ha registrado como alumno.`
          );
        }

        return {
          uid: user.uid,
          nombre: userDocData.nombre,
          email: emailId,
          role: rolAsignado
        };
      } else {
        await signOut(auth);
        throw new Error('Tu cuenta no tiene datos asociados en el sistema. Comunícate con un profesor.');
      }
    } else {
      const userData = userSnap.data();
      if (userData.estado === 'inactivo') {
        await signOut(auth);
        throw new Error('Esta cuenta ha sido desactivada por el administrador.');
      }
      
      return {
        uid: user.uid,
        nombre: user.displayName || userData.nombre || email.split('@')[0],
        email: user.email,
        role: userData.rol || 'alumno'
      };
    }
  } catch (error) {
    console.error("Error en login con Email:", error);
    throw error;
  }
};

export const registerWithEmail = async (email, password, nombre) => {
  try {
    const emailId = email.trim().toLowerCase();

    const preRegistroRef = doc(db, 'pre_registros', emailId);
    const preRegistroSnap = await getDoc(preRegistroRef);

    if (!preRegistroSnap.exists()) {
      const error = new Error('not-invited');
      error.code = 'custom/not-invited';
      throw error;
    }

    const preData = preRegistroSnap.exists() ? preRegistroSnap.data() : { nombre: nombre };
    const rolAsignado = preData.rol || 'alumno';

    // 2. Si está invitado, le creamos la cuenta en Authentication
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const user = result.user;

    // 3. Escribir los datos en la colección "usuarios"
    const userRef = doc(db, 'usuarios', user.uid);
    const userDocData = {
      nombre: preData.nombre || nombre,
      email: emailId,
      telefono: preData.telefono || '',
      rol: rolAsignado,
      estado: 'activo',
      fecha_registro: new Date().toISOString()
    };

    if (rolAsignado === 'alumno') {
      userDocData.plan = preData.plan || 8;
      userDocData.clases_restantes = 0;
      userDocData.turnos_fijos = preData.turnos_fijos || preData.turnosFijos || [];
    }

    await setDoc(userRef, userDocData);
    await deleteDoc(preRegistroRef);

    // Enviar notificación al administrador si es un alumno nuevo
    if (rolAsignado === 'alumno') {
      await crearNotificacion(
        db, 
        'admin', 
        'nuevo_alumno', 
        'Nuevo alumno registrado', 
        `${preData.nombre || nombre} se ha registrado como alumno.`
      );
    }

    // 4. Actualizar el perfil del usuario en Authentication
    try {
      const { updateProfile } = await import('firebase/auth');
      await updateProfile(user, { displayName: preData.nombre || nombre });
    } catch (e) {
      console.error("Error silencioso al actualizar displayName:", e);
    }

    return {
      uid: user.uid,
      nombre: preData.nombre || nombre,
      email: emailId,
      role: rolAsignado
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
