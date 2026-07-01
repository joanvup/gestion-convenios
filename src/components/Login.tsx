import React, { useState } from 'react';
import { Mail, Lock, User as UserIcon, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginProps {
  onLoginSuccess: (token: string, userData: any) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Algo salió mal');
      }

      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message || 'Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const loadDemoCredentials = (role: 'admin' | 'user') => {
    if (role === 'admin') {
      setEmail('admin@convenios.com');
      setPassword('admin123');
    } else {
      setEmail('joan.fuentes@colegiobilingue.edu.co');
      setPassword('convenios2026');
    }
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-md shadow-indigo-100">
            GC
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-slate-900 tracking-tight">
            Gestor de Convenios
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Ingresa tus credenciales para continuar
          </p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm flex items-center gap-2"
          >
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-lg text-sm flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </motion.div>
        )}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Correo Electrónico
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail className="h-4 w-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                placeholder="ejemplo@universidad.edu"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Contraseña
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 border border-transparent rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 transition-all shadow-sm"
          >
            {loading ? 'Cargando...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="text-center mt-4">
          <p className="text-xs text-slate-400">
            ¿No tienes cuenta? Solicita tu registro al <span className="font-semibold text-slate-600">Administrador</span>.
          </p>
        </div>

        {/* Demo Credentials Helper Box */}
        <div className="pt-4 border-t border-slate-100 mt-6">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5 text-center">
            Acceso Rápido de Prueba (Demo)
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => loadDemoCredentials('user')}
              className="px-3 py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 active:bg-slate-200 rounded-lg text-left text-xs transition-all"
            >
              <span className="block font-semibold text-slate-700">Usuario Demo</span>
              <span className="block text-slate-500 truncate">joan.fuentes@colegiobilingue.edu.co</span>
              <span className="block text-[10px] text-indigo-600 font-mono mt-0.5">Clave: convenios2026</span>
            </button>
            <button
              onClick={() => loadDemoCredentials('admin')}
              className="px-3 py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 active:bg-slate-200 rounded-lg text-left text-xs transition-all"
            >
              <span className="block font-semibold text-slate-700">Administrador</span>
              <span className="block text-slate-500 truncate">admin@convenios.com</span>
              <span className="block text-[10px] text-indigo-600 font-mono mt-0.5">Clave: admin123</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
