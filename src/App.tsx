import { useState, useEffect } from 'react';
import { 
  Plus, Search, Filter, LogOut, Download, Upload, AlertCircle, RefreshCw, 
  Trash2, Edit, Eye, ShieldAlert, AlertTriangle, Info, Check, Calendar, ListTodo,
  Users, Shield, Mail, Send, Database, FileDown, History, Sun, Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Convenio, Alerta } from './types';
import { APP_VERSION } from './version';
import Login from './components/Login';
import ConvenioModal from './components/ConvenioModal';
import ConvenioDetailModal from './components/ConvenioDetailModal';
import AlertPanel from './components/AlertPanel';
import StatsGrid from './components/StatsGrid';
import TimelineView from './components/TimelineView';
import ImportModal from './components/ImportModal';
import UserManagement from './components/UserManagement';
import EmailConfig from './components/EmailConfig';
import CatalogManagement from './components/CatalogManagement';
import AuditLogs from './components/AuditLogs';
import ResetDatabaseModal from './components/ResetDatabaseModal';
import ExpiredToast from './components/ExpiredToast';
import ServerClockWidget from './components/ServerClockWidget';
import { generateConveniosPDF } from './utils/pdfExport';

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [alerts, setAlerts] = useState<Alerta[]>([]);

  // Version state
  const [currentVersion, setCurrentVersion] = useState<string>(APP_VERSION);

  useEffect(() => {
    fetch('/api/system/version')
      .then(res => res.json())
      .then(data => {
        if (data.version) setCurrentVersion(data.version);
      })
      .catch(() => {});
  }, []);

  // Dark mode state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('convenios_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('convenios_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('convenios_theme', 'light');
    }
  }, [darkMode]);
  
  // UI views & Modals
  const [activeTab, setActiveTab] = useState<'list' | 'timeline' | 'users' | 'email' | 'catalogos' | 'audit'>('list');
  const [selectedConvenioId, setSelectedConvenioId] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingConvenio, setEditingConvenio] = useState<Convenio | undefined>(undefined);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showResetDbModal, setShowResetDbModal] = useState(false);
  const [showExpiredToast, setShowExpiredToast] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlan, setFilterPlan] = useState('');
  const [filterFacultad, setFilterFacultad] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Load user from localStorage on start
  useEffect(() => {
    const savedToken = localStorage.getItem('convenios_token');
    const savedUser = localStorage.getItem('convenios_user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        // Clear corrupt state
        localStorage.removeItem('convenios_token');
        localStorage.removeItem('convenios_user');
      }
    }
  }, []);

  // Fetch data from backend
  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      // Fetch convenios
      const resConvenios = await fetch('/api/convenios', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataConvenios = await resConvenios.json();
      if (resConvenios.ok) {
        setConvenios(dataConvenios);
      }

      // Fetch alerts
      const resAlerts = await fetch('/api/alerts', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataAlerts = await resAlerts.json();
      if (resAlerts.ok) {
        setAlerts(dataAlerts);
        const expired = dataAlerts.filter((a: Alerta) => a.tipo === 'vencido' || a.severidad === 'danger' || (a.diasRestantes !== null && a.diasRestantes < 0));
        if (expired.length > 0) {
          setShowExpiredToast(true);
        }
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch whenever token changes
  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  const handleLoginSuccess = (userToken: string, userData: any) => {
    setToken(userToken);
    setUser(userData);
    localStorage.setItem('convenios_token', userToken);
    localStorage.setItem('convenios_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setConvenios([]);
    setAlerts([]);
    localStorage.removeItem('convenios_token');
    localStorage.removeItem('convenios_user');
  };

  const handleDeleteConvenio = async (id: number, codigo: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar el convenio ${codigo}? Esta acción es irreversible en la base de datos SQLite.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/convenios/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        // Filter out locally
        setConvenios(prev => prev.filter(c => c.id !== id));
        setAlerts(prev => prev.filter(a => a.convenioId !== id));
        if (selectedConvenioId === id) {
          setSelectedConvenioId(null);
        }
      } else {
        const err = await res.json();
        alert(err.error || 'No se pudo eliminar el convenio');
      }
    } catch (error) {
      console.error(error);
      alert('Error de conexión al eliminar');
    }
  };

  const handleDismissAlert = async (convenioId: number, alertKey: string) => {
    try {
      const res = await fetch('/api/alerts/dismiss', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ convenioId, alertKey })
      });

      if (res.ok) {
        // Refresh alerts list
        const resAlerts = await fetch('/api/alerts', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const dataAlerts = await resAlerts.json();
        if (resAlerts.ok) {
          setAlerts(dataAlerts);
        }
        
        // Also refresh individual convenio alerts if list enriched
        const resConvenios = await fetch('/api/convenios', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const dataConvenios = await resConvenios.json();
        if (resConvenios.ok) {
          setConvenios(dataConvenios);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Extract unique plans and faculties for filter dropdowns
  const uniquePlans = Array.from(
    new Set(convenios.map(c => c.plan_servicio).filter(Boolean))
  ) as string[];

  const uniqueFaculties = Array.from(
    new Set(convenios.map(c => c.facultad).filter(Boolean))
  ) as string[];

  // Filter agreements based on search, dropdown filters, and status selection
  const filteredConvenios = convenios.filter(c => {
    // 1. Text Search query (Checks code, title, investigator principal, and facultad)
    const matchesSearch = 
      c.codigo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.titulo_proyecto.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.investigador_principal && c.investigador_principal.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.facultad && c.facultad.toLowerCase().includes(searchQuery.toLowerCase()));

    // 2. Dropdown Filter: Plan
    const matchesPlan = filterPlan ? c.plan_servicio === filterPlan : true;

    // 3. Dropdown Filter: Facultad
    const matchesFacultad = filterFacultad ? c.facultad === filterFacultad : true;

    // 4. Status Filter
    let matchesStatus = true;
    if (filterStatus !== 'all') {
      const hasActiveAlerts = c.alerts && c.alerts.length > 0;
      const isSuspended = c.fecha_suspension && !c.fecha_reinicio;
      
      if (filterStatus === 'alert') {
        matchesStatus = !!hasActiveAlerts;
      } else if (filterStatus === 'suspended') {
        matchesStatus = !!isSuspended;
      } else if (filterStatus === 'expired') {
        // Check if actually expired
        const hasExpiredAlert = c.alerts?.some(a => a.tipo === 'vencido');
        matchesStatus = !!hasExpiredAlert;
      } else if (filterStatus === 'active') {
        // Active and no expired alert and not suspended
        const hasExpiredAlert = c.alerts?.some(a => a.tipo === 'vencido');
        matchesStatus = !isSuspended && !hasExpiredAlert;
      }
    }

    return matchesSearch && matchesPlan && matchesFacultad && matchesStatus;
  });

  // Currency utility
  const formatCurrency = (val: number | null) => {
    if (val === null || isNaN(val)) return 'N/A';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
  };

  const getStatusBadge = (c: Convenio) => {
    if (c.fecha_suspension && !c.fecha_reinicio) {
      return (
        <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">
          <Info className="w-3 h-3" />
          Suspendido
        </span>
      );
    }

    const hasExpired = c.alerts?.some(a => a.tipo === 'vencido');
    if (hasExpired) {
      return (
        <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full animate-pulse">
          <ShieldAlert className="w-3 h-3" />
          Vencido
        </span>
      );
    }

    const hasUrgent = c.alerts?.some(a => a.tipo === 'vence_pronto');
    if (hasUrgent) {
      return (
        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">
          <AlertTriangle className="w-3 h-3" />
          Cerca a Vencer
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">
        <Check className="w-3 h-3" />
        Vigente
      </span>
    );
  };

  const handleExportPDF = () => {
    generateConveniosPDF({
      convenios: filteredConvenios,
      filters: {
        searchQuery,
        filterStatus,
        filterPlan,
        filterFacultad,
      }
    });
  };

  if (!token) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const selectedConvenio = convenios.find(c => c.id === selectedConvenioId);

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-800 pb-12">
      
      {/* Top Banner/Header */}
      <nav id="app-nav" className="bg-white border-b border-slate-200/80 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                GC
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-slate-900 block">Gestor de Convenios</span>
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                    v{currentVersion}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono font-medium block leading-none">SQLite Local DB</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 sm:gap-3">
              {/* Live Server Clock & Email Schedule Status Widget */}
              <ServerClockWidget 
                token={token || undefined} 
                onOpenEmailConfig={user?.role === 'admin' ? () => setActiveTab('email') : undefined} 
              />

              {/* Dark Mode Toggle Switch */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/90 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                title={darkMode ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
                aria-label="Toggle Modo Oscuro"
              >
                {darkMode ? (
                  <>
                    <Sun className="w-4 h-4 text-amber-400 fill-amber-400/20" />
                    <span className="hidden sm:inline">Modo Claro</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="hidden sm:inline">Modo Oscuro</span>
                  </>
                )}
              </button>

              <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>

              <div className="hidden sm:block text-right">
                <span className="text-xs font-semibold text-slate-800 block">{user?.name}</span>
                <span className="text-[10px] text-indigo-600 font-semibold uppercase tracking-wider block leading-none">
                  Rol: {user?.role}
                </span>
              </div>
              <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 hover:bg-red-50 text-slate-500 hover:text-red-600 border border-transparent hover:border-red-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Consola de Control de Convenios</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Administración de acuerdos, fiscalización de prórrogas y alertas automáticas de renovación.
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98] rounded-xl text-slate-600 transition-all shadow-2xs"
              title="Sincronizar base de datos"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
            
            <button
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 hover:text-indigo-600 active:scale-[0.98] rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              Importar en Lote
            </button>

            <button
              onClick={handleExportPDF}
              disabled={filteredConvenios.length === 0}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white active:scale-[0.98] rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5"
              title="Descargar reporte en formato PDF de los convenios filtrados"
            >
              <FileDown className="w-4 h-4 text-indigo-400" />
              Generar Informe PDF
            </button>

            <button
              onClick={() => {
                setEditingConvenio(undefined);
                setShowCreateModal(true);
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white active:scale-[0.98] rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-4.5 h-4.5" />
              Nuevo Convenio
            </button>
          </div>
        </div>

        {/* Dynamic Statistics Grid */}
        <StatsGrid convenios={convenios} alerts={alerts} />

        {/* Main Content Layout: Two Columns (Alerts Panel + Main Content Table/Timeline) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Column 1: Active Alert Notifications Box */}
          <div id="alert-panel" className="lg:col-span-1 space-y-4">
            <AlertPanel 
              alerts={alerts} 
              onDismiss={handleDismissAlert} 
              onSelectConvenio={(id) => setSelectedConvenioId(id)} 
            />

            {/* Quick Helper Info Box */}
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-xl p-5 shadow-md border border-slate-800">
              <h4 className="font-bold text-sm text-indigo-200">¿Cómo funcionan las Alertas?</h4>
              <p className="text-xs text-indigo-100/85 mt-2 leading-relaxed">
                El motor analiza la vigencia real restando prórrogas y ampliaciones en SQLite.
              </p>
              <ul className="mt-3 space-y-2 text-[11px] text-indigo-200/90 font-medium">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-rose-500 rounded-full shrink-0"></span>
                  <span><strong>Vencido:</strong> Fecha fin ya transcurrió.</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full shrink-0"></span>
                  <span><strong>&lt; 30 días:</strong> Urgente (Alerta Naranja)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full shrink-0"></span>
                  <span><strong>&lt; 90 días:</strong> Preventiva (Alerta Amarilla)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full shrink-0"></span>
                  <span><strong>Informes:</strong> Primer informe sin entregar y plazo cerca.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Column 2 & 3: Filterable Tables & Timelines */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Nav tabs for Main Workspace & Admin Actions */}
            <div className="bg-white p-1.5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-2.5">
              {/* Tab navigation pills with smooth horizontal scroll */}
              <div className="flex items-center gap-1 overflow-x-auto scroll-smooth py-0.5 max-w-full flex-nowrap [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <button
                  onClick={() => setActiveTab('list')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                    activeTab === 'list'
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-700 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <ListTodo className="w-3.5 h-3.5 shrink-0" />
                  <span className="relative">
                    Tablero de Convenios
                    {activeTab === 'list' && (
                      <span className="absolute -bottom-1 left-0 right-0 h-[2px] bg-white rounded-full shadow-2xs animate-in fade-in zoom-in-75 duration-150" />
                    )}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('timeline')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                    activeTab === 'timeline'
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-700 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span className="relative">
                    Cronograma
                    {activeTab === 'timeline' && (
                      <span className="absolute -bottom-1 left-0 right-0 h-[2px] bg-white rounded-full shadow-2xs animate-in fade-in zoom-in-75 duration-150" />
                    )}
                  </span>
                </button>
                {user?.role === 'admin' && (
                  <>
                    <button
                      onClick={() => setActiveTab('email')}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                        activeTab === 'email'
                          ? 'bg-gradient-to-r from-indigo-600 to-violet-700 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                      }`}
                    >
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      <span className="relative">
                        Configurar Correo
                        {activeTab === 'email' && (
                          <span className="absolute -bottom-1 left-0 right-0 h-[2px] bg-white rounded-full shadow-2xs animate-in fade-in zoom-in-75 duration-150" />
                        )}
                      </span>
                    </button>
                    <button
                      onClick={() => setActiveTab('catalogos')}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                        activeTab === 'catalogos'
                          ? 'bg-gradient-to-r from-indigo-600 to-violet-700 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                      }`}
                    >
                      <Database className="w-3.5 h-3.5 shrink-0" />
                      <span className="relative">
                        Catálogos BD
                        {activeTab === 'catalogos' && (
                          <span className="absolute -bottom-1 left-0 right-0 h-[2px] bg-white rounded-full shadow-2xs animate-in fade-in zoom-in-75 duration-150" />
                        )}
                      </span>
                    </button>
                    <button
                      onClick={() => setActiveTab('users')}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                        activeTab === 'users'
                          ? 'bg-gradient-to-r from-indigo-600 to-violet-700 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5 shrink-0" />
                      <span className="relative">
                        Gestión Usuarios
                        {activeTab === 'users' && (
                          <span className="absolute -bottom-1 left-0 right-0 h-[2px] bg-white rounded-full shadow-2xs animate-in fade-in zoom-in-75 duration-150" />
                        )}
                      </span>
                    </button>
                    <button
                      onClick={() => setActiveTab('audit')}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                        activeTab === 'audit'
                          ? 'bg-gradient-to-r from-indigo-600 to-violet-700 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                      }`}
                    >
                      <History className="w-3.5 h-3.5 shrink-0" />
                      <span className="relative">
                        Auditoría
                        {activeTab === 'audit' && (
                          <span className="absolute -bottom-1 left-0 right-0 h-[2px] bg-white rounded-full shadow-2xs animate-in fade-in zoom-in-75 duration-150" />
                        )}
                      </span>
                    </button>
                  </>
                )}
              </div>

              {/* Admin Database Backup & Management Button */}
              {user?.role === 'admin' && (
                <div className="flex items-center gap-2 pt-1.5 md:pt-0 border-t md:border-t-0 border-slate-100 shrink-0">
                  <button
                    onClick={() => setShowResetDbModal(true)}
                    className="w-full md:w-auto px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 text-indigo-700 bg-indigo-50 hover:bg-indigo-100/90 border border-indigo-200/90 shadow-2xs active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
                    title="Gestión de Respaldo, Restauración e Inicialización de la Base de Datos SQLite"
                  >
                    <Database className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>Respaldo / BD</span>
                  </button>
                </div>
              )}
            </div>

            {/* TABLERO DE CONVENIOS VIEW */}
            {activeTab === 'list' && (
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
                
                {/* Filters Row */}
                <div className="p-5 border-b border-slate-100 bg-slate-50/40 space-y-4">
                  
                  {/* Search Bar & State Filter */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Search className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar por código, título, facultad, investigador..."
                        className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:border-indigo-500 bg-white"
                      />
                    </div>

                    <div className="flex gap-2">
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="all">Todos los Estados</option>
                        <option value="active">Activos / Vigentes</option>
                        <option value="alert">Con Alertas Activas</option>
                        <option value="expired">Vencidos</option>
                        <option value="suspended">Suspendidos</option>
                      </select>

                      <button
                        onClick={handleExportPDF}
                        disabled={filteredConvenios.length === 0}
                        className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0"
                        title="Exportar PDF de convenios visibles"
                      >
                        <FileDown className="w-4 h-4 text-indigo-600" />
                        <span className="hidden sm:inline">Exportar PDF</span>
                      </button>
                    </div>
                  </div>

                  {/* Dropdown Filters (Facultad, Plan) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Filtrar por Plan de Servicio (Convocatoria)
                      </label>
                      <select
                        value={filterPlan}
                        onChange={(e) => setFilterPlan(e.target.value)}
                        className="block w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white focus:outline-none"
                      >
                        <option value="">Cualquier Plan</option>
                        {uniquePlans.map(plan => (
                          <option key={plan} value={plan}>{plan}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Filtrar por Facultad Responsable
                      </label>
                      <select
                        value={filterFacultad}
                        onChange={(e) => setFilterFacultad(e.target.value)}
                        className="block w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white focus:outline-none"
                      >
                        <option value="">Cualquier Facultad</option>
                        {uniqueFaculties.map(fac => (
                          <option key={fac} value={fac}>{fac}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Table Data list */}
                <div className="overflow-x-auto">
                  {filteredConvenios.length === 0 ? (
                    <div className="text-center py-12 px-4">
                      <p className="text-slate-400 text-sm font-medium">
                        {convenios.length === 0 
                          ? 'No hay convenios en la base de datos local SQLite.' 
                          : 'Ningún convenio coincide con los filtros establecidos.'}
                      </p>
                      {convenios.length === 0 && (
                        <div className="mt-4 flex gap-3 justify-center">
                          <button
                            onClick={() => setShowImportModal(true)}
                            className="text-xs font-bold text-indigo-600 hover:underline border border-indigo-200 hover:bg-indigo-50 px-3 py-1.5 rounded-lg"
                          >
                            Cargar Datos de Demostración
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <table className="min-w-full divide-y divide-slate-100">
                      <thead className="bg-slate-50/65">
                        <tr>
                          <th scope="col" className="px-5 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Código / Identificación
                          </th>
                          <th scope="col" className="px-5 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Título Proyecto / Investigador
                          </th>
                          <th scope="col" className="px-5 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Financiación
                          </th>
                          <th scope="col" className="px-5 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Vencimiento Estimado
                          </th>
                          <th scope="col" className="px-5 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Estado
                          </th>
                          <th scope="col" className="relative px-5 py-3 text-right">
                            <span className="sr-only">Acciones</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-100">
                        {filteredConvenios.map((c) => {
                          // Effective expiration calculation
                          const dateToDisplay = c.fecha_terminacion_prorroga || c.fecha_terminacion_ampliacion || c.fecha_terminacion || 'No definida';
                          const hasAlerts = c.alerts && c.alerts.length > 0;

                          return (
                            <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-5 py-4.5 whitespace-nowrap">
                                <span className="font-mono text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded shadow-2xs">
                                  {c.codigo}
                                </span>
                                <span className="block text-[10px] text-slate-400 mt-1 truncate max-w-[120px]">
                                  {c.no_convenio || 'Sin No. Contrato'}
                                </span>
                              </td>
                              <td className="px-5 py-4.5">
                                <div className="max-w-[280px] md:max-w-[340px]">
                                  <p className="text-xs font-bold text-slate-900 line-clamp-2" title={c.titulo_proyecto}>
                                    {c.titulo_proyecto}
                                  </p>
                                  <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                                    <span className="font-semibold">{c.investigador_principal || 'Investigador Omitido'}</span>
                                    {c.facultad && (
                                      <>
                                        <span className="text-slate-300">•</span>
                                        <span className="text-slate-400 italic font-medium">{c.facultad}</span>
                                      </>
                                    )}
                                  </p>
                                </div>
                              </td>
                              <td className="px-5 py-4.5 whitespace-nowrap">
                                <span className="text-xs font-bold text-slate-800">
                                  {formatCurrency(c.valor)}
                                </span>
                                <span className="block text-[10px] text-slate-400 mt-0.5">
                                  {c.duracion || 'Sin duración'}
                                </span>
                              </td>
                              <td className="px-5 py-4.5 whitespace-nowrap">
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-slate-700">
                                    {dateToDisplay}
                                  </span>
                                  {c.fecha_terminacion_prorroga ? (
                                    <span className="text-[9px] text-indigo-600 font-bold uppercase mt-0.5">Vía Prórroga</span>
                                  ) : c.fecha_terminacion_ampliacion ? (
                                    <span className="text-[9px] text-amber-600 font-bold uppercase mt-0.5">Vía Ampliación</span>
                                  ) : null}
                                </div>
                              </td>
                              <td className="px-5 py-4.5 whitespace-nowrap">
                                <div className="flex flex-col items-start gap-1">
                                  {getStatusBadge(c)}
                                  {hasAlerts && (
                                    <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">
                                      {c.alerts!.length} alertas
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-5 py-4.5 whitespace-nowrap text-right text-sm font-medium">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => setSelectedConvenioId(c.id)}
                                    className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition-all"
                                    title="Inspeccionar todo el convenio"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingConvenio(c);
                                      setShowCreateModal(true);
                                    }}
                                    className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-indigo-600 rounded-lg transition-all"
                                    title="Modificar convenio"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteConvenio(c.id, c.codigo)}
                                    className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-all"
                                    title="Eliminar convenio de base de datos"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Table Footer Stats counts */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between font-semibold">
                  <span>Viendo {filteredConvenios.length} de {convenios.length} Convenios</span>
                  <span>SQLite DB local activa</span>
                </div>
              </div>
            )}

            {/* CRONOGRAMA TEMPORAL VIEW */}
            {activeTab === 'timeline' && (
              <TimelineView 
                convenios={convenios} 
                onSelectConvenio={(id) => setSelectedConvenioId(id)} 
              />
            )}

            {/* GESTIÓN DE CATÁLOGOS (PLANES Y FACULTADES) VIEW (Admin Only) */}
            {activeTab === 'catalogos' && user?.role === 'admin' && token && (
              <CatalogManagement 
                token={token} 
                currentUser={user} 
              />
            )}

            {/* GESTIÓN DE USUARIOS VIEW (Admin Only) */}
            {activeTab === 'users' && user?.role === 'admin' && (
              <UserManagement 
                token={token} 
                currentUser={user} 
              />
            )}

            {/* CONFIGURACIÓN DE CORREO VIEW (Admin Only) */}
            {activeTab === 'email' && user?.role === 'admin' && token && (
              <EmailConfig token={token} />
            )}

            {/* AUDITORÍA DE CAMBIOS EN BASE DE DATOS VIEW (Admin Only) */}
            {activeTab === 'audit' && user?.role === 'admin' && token && (
              <AuditLogs token={token} />
            )}

          </div>

        </div>

      </main>

      {/* --- FLOATING MODALS --- */}

      {/* Create / Edit Modal */}
      {showCreateModal && (
        <ConvenioModal
          convenio={editingConvenio}
          onClose={() => {
            setShowCreateModal(false);
            setEditingConvenio(undefined);
          }}
          onSave={() => {
            fetchData();
          }}
          token={token}
        />
      )}

      {/* Detail Modal */}
      {selectedConvenio && (
        <ConvenioDetailModal
          convenio={selectedConvenio}
          onClose={() => setSelectedConvenioId(null)}
          canEdit={true}
          onEdit={() => {
            setEditingConvenio(selectedConvenio);
            setShowCreateModal(true);
          }}
        />
      )}

      {/* Bulk Import Modal */}
      {showImportModal && token && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onImportSuccess={() => {
            fetchData();
          }}
          token={token}
        />
      )}

      {/* Reset Database Modal (Admin Only) */}
      {showResetDbModal && token && (
        <ResetDatabaseModal
          token={token}
          onClose={() => setShowResetDbModal(false)}
          onSuccess={() => {
            fetchData();
          }}
        />
      )}

      {/* Expired Agreements Toast Notification (Top-Right) */}
      {showExpiredToast && token && (
        <ExpiredToast
          expiredAlerts={alerts.filter(a => a.tipo === 'vencido' || a.severidad === 'danger' || (a.diasRestantes !== null && a.diasRestantes < 0))}
          onClose={() => setShowExpiredToast(false)}
          onViewAlerts={() => {
            setActiveTab('list');
            const el = document.getElementById('alert-panel');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          onSelectConvenio={(id) => setSelectedConvenioId(id)}
        />
      )}

    </div>
  );
}
