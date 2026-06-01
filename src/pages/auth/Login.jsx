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
        <div className="w-56 h-56 mx-auto mb-4">
          <img 
            src="/logo.webp" 
            alt="Loto Pilates Logo" 
            className="w-full h-full object-contain drop-shadow-xl"
          />
        </div>
        <h1 className="text-5xl font-black tracking-tight font-serif text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-400">
          Loto Pilates
        </h1>
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
