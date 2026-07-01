import React, { useState, useEffect } from 'react';
import { UserPlus, Shield, Trash2, Mail, Lock, User as UserIcon, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import { User } from '../types';

interface UserManagementProps {
  token: string;
  currentUser: User | null;
}

export default function UserManagement({ token, currentUser }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'usuario' | 'admin'>('usuario');

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudieron cargar los usuarios');
      }
      setUsers(data.users || []);
    } catch (err: any) {
      setError(err.message || 'Error al obtener usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const handleRegisterUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, email, password, role })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo registrar el usuario');
      }

      setSuccess(`¡Usuario "${name}" registrado correctamente!`);
      setName('');
      setEmail('');
      setPassword('');
      setRole('usuario');
      
      // Refresh the user list
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: number, userName: string) => {
    if (currentUser && currentUser.id === id) {
      setError('No puedes eliminar tu propia cuenta de administrador.');
      return;
    }

    if (!window.confirm(`¿Estás seguro de que deseas eliminar la cuenta de "${userName}"? Esta acción removerá su acceso de forma permanente.`)) {
      return;
    }

    setError('');
    setSuccess('');
    
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo eliminar el usuario');
      }

      setSuccess(`Usuario "${userName}" eliminado de forma permanente.`);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar el usuario');
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden" id="user-management-module">
      <div className="p-6 border-b border-slate-100 bg-slate-50/40 flex justify-between items-center">
        <div>
          <h3 className="text-base font-bold text-slate-950 flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600" />
            Consola de Gestión de Cuentas de Usuario
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Solo tú, como administrador, tienes acceso a este módulo para registrar y revocar accesos al sistema.
          </p>
        </div>
        <button
          onClick={fetchUsers}
          disabled={loading}
          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-all"
          title="Actualizar lista"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="p-6">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Form to Register New User */}
          <div className="lg:col-span-5 bg-slate-50 p-5 rounded-xl border border-slate-200/70">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-indigo-600" />
              Registrar Nuevo Colaborador
            </h4>

            <form onSubmit={handleRegisterUser} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Nombre Completo
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <UserIcon className="h-3.5 w-3.5" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Juan Pérez"
                    className="block w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-slate-800 text-xs placeholder-slate-400 focus:outline-none focus:border-indigo-500 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-3.5 w-3.5" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="correo@universidad.edu"
                    className="block w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-slate-800 text-xs placeholder-slate-400 focus:outline-none focus:border-indigo-500 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Contraseña Temporal
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-3.5 w-3.5" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-slate-800 text-xs placeholder-slate-400 focus:outline-none focus:border-indigo-500 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Rol del Usuario
                </label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setRole('usuario')}
                    className={`py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all text-center ${
                      role === 'usuario'
                        ? 'bg-white border-indigo-600 text-indigo-700 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Usuario Estándar
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('admin')}
                    className={`py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all text-center ${
                      role === 'admin'
                        ? 'bg-white border-indigo-600 text-indigo-700 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Administrador
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 py-2 px-4 border border-transparent rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-2xs disabled:bg-indigo-400"
              >
                {submitting ? 'Registrando...' : 'Registrar Cuenta'}
              </button>
            </form>
          </div>

          {/* List of Registered Users */}
          <div className="lg:col-span-7">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
              Cuentas con Acceso Registradas ({users.length})
            </h4>

            <div className="border border-slate-200/80 rounded-xl overflow-hidden bg-white">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-slate-50/50">
                    <tr>
                      <th scope="col" className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-400 uppercase">
                        Colaborador
                      </th>
                      <th scope="col" className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-400 uppercase">
                        Rol
                      </th>
                      <th scope="col" className="relative px-4 py-2.5 text-right">
                        <span className="sr-only">Acciones</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((u) => {
                      const isMe = currentUser?.id === u.id;
                      return (
                        <tr key={u.id} className="hover:bg-slate-50/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                                {u.name}
                                {isMe && (
                                  <span className="bg-slate-100 border border-slate-200 text-[9px] text-slate-600 px-1 py-0.2 rounded font-semibold font-mono">
                                    TÚ
                                  </span>
                                )}
                              </span>
                              <span className="text-[11px] text-slate-400 font-mono mt-0.5">{u.email}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {u.role === 'admin' ? (
                              <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 text-[9px] font-bold uppercase px-2 py-0.5 rounded-full">
                                Administrador
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-slate-50 text-slate-700 border border-slate-200 text-[9px] font-bold uppercase px-2 py-0.5 rounded-full">
                                Usuario Estándar
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right text-xs font-semibold">
                            {!isMe && (
                              <button
                                onClick={() => handleDeleteUser(u.id, u.name)}
                                className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-all"
                                title="Eliminar cuenta"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            
            <p className="text-[10px] text-slate-400 mt-3 italic">
              * Nota: Un usuario eliminado ya no podrá ingresar usando sus credenciales habituales.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
