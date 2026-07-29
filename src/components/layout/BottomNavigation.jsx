import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Calendar, CheckCircle, CreditCard, Users, Home, UserPlus } from 'lucide-react';
import { db } from '../../config/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export default function BottomNavigation() {
  const role = useAuthStore(state => state.role);
  const [hasAdminNotifs, setHasAdminNotifs] = useState(false);

  useEffect(() => {
    if (role === 'superadmin') {
      const q = query(
        collection(db, 'notificaciones'),
        where('usuarioId', '==', 'admin')
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setHasAdminNotifs(!snapshot.empty);
      });
      return () => unsubscribe();
    }
  }, [role]);

  // Define nav items based on role
  let navItems = [];

  if (role === 'alumno') {
    navItems = [
      { to: '/alumno/dashboard', icon: Home, label: 'Inicio', activeColor: 'text-primary-asistencia' },
      { to: '/alumno/turnos', icon: Calendar, label: 'Mis Turnos', activeColor: 'text-primary-asistencia' },
    ];
  } else if (role === 'admin') {
    navItems = [
      { to: '/admin/alta-alumno', icon: UserPlus, label: 'Alta', activeColor: 'text-primary-turnos' },
      { to: '/admin/asistencias', icon: CheckCircle, label: 'Camillas', activeColor: 'text-primary-turnos' },
      { to: '/admin/calendario', icon: Calendar, label: 'Calendario', activeColor: 'text-primary-turnos' },
      { to: '/admin/alumnos', icon: Users, label: 'Alumnos', activeColor: 'text-primary-turnos' },
    ];
  } else if (role === 'superadmin') {
    navItems = [
      { to: '/admin/alta-alumno', icon: UserPlus, label: 'Alta', activeColor: 'text-primary-pagos' },
      { to: '/admin/asistencias', icon: CheckCircle, label: 'Camillas', activeColor: 'text-primary-pagos' },
      { to: '/admin/calendario', icon: Calendar, label: 'Calendario', activeColor: 'text-primary-pagos' },
      { to: '/superadmin/pagos', icon: CreditCard, label: 'Pagos', activeColor: 'text-primary-pagos' },
      { to: '/superadmin/usuarios', icon: Users, label: 'Usuarios', activeColor: 'text-primary-pagos' },
    ];
  }

  if (navItems.length === 0) return null;

  return (
    <nav className="fixed bottom-0 w-full bg-white border-t border-gray-200 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            state={item.label === 'Usuarios' && hasAdminNotifs ? { tab: 'notificaciones' } : {}}
            className={({ isActive }) => 
              `flex flex-col items-center justify-center w-full h-full transition-colors relative ${
                isActive ? item.activeColor : 'text-gray-400'
              }`
            }
          >
            <div className="relative">
              <item.icon size={24} className="mb-1" />
              {item.label === 'Usuarios' && hasAdminNotifs && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
              )}
            </div>
            <span className="text-xs font-medium">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
