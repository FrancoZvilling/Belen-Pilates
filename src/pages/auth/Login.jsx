import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Mail, Lock, Eye, EyeOff, User, AlertCircle } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { login, loginWithEmail, registerWithEmail } = useAuthStore();
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Form State
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await login();
      navigate('/');
    } catch (err) {
      if (err.code === 'custom/not-invited') {
        setError("Todavía no te han cargado al sistema, por favor comunicate con algún profesor.");
      } else {
        setError("No se pudo iniciar sesión con Google. Intenta de nuevo.");
      }
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Por favor completa todos los campos.");
      return;
    }
    if (isRegistering && !nombre) {
      setError("Por favor ingresa tu nombre.");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      if (isRegistering) {
        await registerWithEmail(email, password, nombre);
      } else {
        await loginWithEmail(email, password, rememberMe);
      }
      
      navigate('/');
    } catch (err) {
      console.error(err);
      if (err.code === 'custom/not-invited') {
        setError("Todavía no te han cargado al sistema, por favor comunicate con algún profesor.");
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError("Correo o contraseña incorrectos.");
      } else if (err.code === 'auth/email-already-in-use') {
        setError("Este correo ya está registrado.");
      } else {
        setError("Ocurrió un error. Verifica tus datos y vuelve a intentar.");
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center px-5 font-sans py-10">
      
      {/* Branding */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-primary-asistencia text-white rounded-[2rem] flex items-center justify-center mx-auto shadow-lg mb-6 rotate-3">
          <span className="text-3xl font-black font-serif">BP</span>
        </div>
        <h1 className="text-4xl font-black text-gray-800 tracking-tight">Belén Pilates</h1>
        <p className="text-gray-500 font-medium mt-2">Estudio de movimiento</p>
      </div>

      {/* Auth Container */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-2xl font-black text-gray-800 mb-6 text-center">
          {isRegistering ? 'Crear Cuenta' : 'Iniciar Sesión'}
        </h2>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl text-sm font-semibold flex items-center mb-6">
            <AlertCircle size={18} className="mr-2 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {isRegistering && (
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Nombre Completo</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User size={18} className="text-gray-400" />
                </div>
                <input 
                  type="text" 
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-primary-turnos focus:border-transparent transition-all text-gray-700 font-medium"
                  placeholder="Ej: Laura Gómez"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Correo Electrónico</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail size={18} className="text-gray-400" />
              </div>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-primary-turnos focus:border-transparent transition-all text-gray-700 font-medium"
                placeholder="tu@correo.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Contraseña</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock size={18} className="text-gray-400" />
              </div>
              <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-primary-turnos focus:border-transparent transition-all text-gray-700 font-medium"
                placeholder="Mínimo 6 caracteres"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {!isRegistering && (
            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center space-x-2 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input 
                    type="checkbox" 
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="peer appearance-none w-5 h-5 border-2 border-gray-300 rounded-md checked:bg-primary-turnos checked:border-primary-turnos transition-all"
                  />
                  <div className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none">
                    <svg className="w-3 h-3" viewBox="0 0 14 10" fill="none">
                      <path d="M1 5L4.5 8.5L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-600 group-hover:text-gray-800 transition-colors">Recordarme</span>
              </label>
              
              <button type="button" className="text-sm font-bold text-primary-turnos hover:text-blue-600 transition-colors">
                ¿Olvidaste tu clave?
              </button>
            </div>
          )}

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full mt-6 bg-gray-800 hover:bg-gray-900 text-white font-bold py-4 rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center shadow-md"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              isRegistering ? 'Crear Cuenta' : 'Ingresar a mi perfil'
            )}
          </button>
        </form>

        {/* Separator */}
        <div className="flex items-center my-6">
          <div className="flex-1 border-t border-gray-100"></div>
          <span className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">O continuar con</span>
          <div className="flex-1 border-t border-gray-100"></div>
        </div>

        {/* Google Button */}
        <button 
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full bg-white border-2 border-gray-100 text-gray-700 font-bold py-3.5 rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center hover:bg-gray-50 hover:border-gray-200"
        >
          <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Google
        </button>

      </div>

      {/* Toggle Register/Login */}
      <div className="text-center mt-6">
        <p className="text-gray-500 font-medium">
          {isRegistering ? '¿Ya tenés una cuenta?' : '¿No tenés cuenta?'}
          <button 
            type="button"
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError(null);
            }}
            className="ml-2 font-bold text-primary-turnos hover:text-blue-600 transition-colors"
          >
            {isRegistering ? 'Iniciar Sesión' : 'Crear una'}
          </button>
        </p>
      </div>

    </div>
  );
}
