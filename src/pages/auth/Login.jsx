import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const loginAs = useAuthStore(state => state.loginAs);
  const navigate = useNavigate();

  const handleSimulateLogin = (role) => {
    loginAs(role);
    navigate('/'); // Root redirects based on role
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-xl">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">Belén Pilates</h1>
        
        <div className="space-y-4">
          <button 
            onClick={() => handleSimulateLogin('alumno')}
            className="w-full py-4 bg-primary-asistencia text-white font-bold rounded-xl shadow-md active:scale-95 transition-transform"
          >
            Ingresar como Alumno
          </button>
          
          <button 
            onClick={() => handleSimulateLogin('admin')}
            className="w-full py-4 bg-primary-turnos text-white font-bold rounded-xl shadow-md active:scale-95 transition-transform"
          >
            Ingresar como Admin
          </button>
          
          <button 
            onClick={() => handleSimulateLogin('superadmin')}
            className="w-full py-4 bg-primary-pagos text-white font-bold rounded-xl shadow-md active:scale-95 transition-transform"
          >
            Ingresar como Super Admin
          </button>
        </div>
      </div>
    </div>
  );
}
