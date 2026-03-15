import React, { useState, useEffect } from 'react';
import { LawCase, CaseStatus, ViewState, DashboardStats, User } from '../types';
import * as api from '../services/apiService';
import DashboardStickyNotes from './DashboardStickyNotes';

/** Formatea minutos a "Xh Ym" legible. */
const formatMinutosAHoras = (minutos: number): string => {
  if (!minutos || minutos === 0) return '0h';
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

interface DashboardProps {
  cases: LawCase[];
  onViewChange: (view: ViewState) => void;
  onSelectCase: (lawCase: LawCase) => void;
  onUpdateCase: (updatedCase: LawCase) => void;
  initialStats?: DashboardStats | null;
  onStatsLoaded?: (stats: DashboardStats) => void;
  currentUser?: User | null;
}

const Dashboard: React.FC<DashboardProps> = ({ cases, onViewChange, onSelectCase, onUpdateCase, initialStats, onStatsLoaded, currentUser }) => {
  const now = new Date();
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(initialStats ?? null);
  const [loading, setLoading] = useState(!initialStats);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingAviso, setEditingAviso] = useState(false);
  const [avisoContent, setAvisoContent] = useState('');
  const [displayedAlerts, setDisplayedAlerts] = useState<any[]>([]);
  const [alertsPage, setAlertsPage] = useState(1);
  const [hasMoreAlerts, setHasMoreAlerts] = useState(true);
  const [loadingMoreAlerts, setLoadingMoreAlerts] = useState(false);
  const [displayedCases, setDisplayedCases] = useState<LawCase[]>([]);
  const [casesPage, setCasesPage] = useState(1);
  const [hasMoreCases, setHasMoreCases] = useState(true);
  const [loadingMoreCases, setLoadingMoreCases] = useState(false);
  const [extraActivities, setExtraActivities] = useState<any[]>([]);
  const [activitiesPage, setActivitiesPage] = useState(2);
  const [hasMoreActivities, setHasMoreActivities] = useState(true);
  const [loadingMoreActivities, setLoadingMoreActivities] = useState(false);
  const [exporting, setExporting] = useState(false);

  const displayedActivities = (dashboardStats?.recent_activities || []).concat(extraActivities);

  useEffect(() => {
    if (dashboardStats?.aviso) {
      setAvisoContent(dashboardStats.aviso.contenido);
    }
  }, [dashboardStats]);

  useEffect(() => {
    if (initialStats) {
      setDisplayedAlerts(initialStats.alertas || []);
      setDisplayedCases((initialStats.recent_cases || []) as unknown as LawCase[]);
      setExtraActivities([]);
      setActivitiesPage(2);
      setHasMoreActivities(true);
      if ((initialStats.recent_cases?.length || 0) < 20) {
        loadInitialCases();
      }
    }
  }, [initialStats]);

  const loadInitialCases = async () => {
    try {
      const { results, next } = await api.apiGetCases({}, 2);
      if (results?.length) {
        setDisplayedCases(prev => [...prev, ...results]);
        setCasesPage(2);
        setHasMoreCases(Boolean(next));
      }
    } catch (e) {
      console.error('Error loading initial cases:', e);
    }
  };

  const loadData = async (showLoading = true) => {
    setLoadError(null);
    if (showLoading) setLoading(true);
    try {
      const stats = await api.apiGetDashboard();
      setDashboardStats(stats);
      onStatsLoaded?.(stats);
      if (stats.alertas) {
        setDisplayedAlerts(stats.alertas);
        setHasMoreAlerts(true);
      }
      if (stats.recent_cases) {
        setDisplayedCases(stats.recent_cases as unknown as LawCase[]);
        setHasMoreCases(true);
      }
      setExtraActivities([]);
      setActivitiesPage(2);
      setHasMoreActivities(true);
    } catch (error: any) {
      console.error('Error al cargar datos del dashboard:', error);
      const msg = error?.name === 'AbortError'
        ? 'El servidor tardó demasiado. Si está en modo ahorro, puede tardar hasta 1 min en despertar.'
        : (error?.message || 'No se pudieron cargar los datos.');
      setLoadError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAviso = async () => {
    try {
      const created = await api.apiCreateAviso(avisoContent);
      setEditingAviso(false);
      setAvisoContent(created.contenido);
      setDashboardStats((prev) => (prev ? { ...prev, aviso: created } : null));
      if (dashboardStats) {
        onStatsLoaded?.({ ...dashboardStats, aviso: created });
      }
    } catch (e) {
      alert('Error al guardar aviso');
    }
  };

  // Asegurar que cases sea un array
  const casesArray = Array.isArray(cases) ? cases : [];

  useEffect(() => {
    const hasInitial = !!initialStats;
    if (hasInitial) return;
    loadData(true);
  }, []);

  const loadMoreAlerts = async () => {
    if (loadingMoreAlerts || !hasMoreAlerts) return;
    setLoadingMoreAlerts(true);
    try {
      const nextPage = alertsPage + 1;
      const { results, next } = await api.apiGetDashboardAlertasPaginated(nextPage);

      // Filtrar duplicados
      const currentIds = new Set(displayedAlerts.map(a => a.id));
      const unique = results.filter((a: any) => !currentIds.has(a.id));

      // Mapear para agregar caseObj si es necesario (el endpoint de alertas trae 'caso' ID, necesitamos mapearlo si queremos navegar)
      // Aunque el endpoint de alertas estándar trae el objeto 'caso' ID.
      // El dashboard traía un serializer especial.
      // Para mantener compatibilidad visual, intentaremos enriquecer con data local si es posible, 
      // o ajustaremos el renderizado para tolerar falta de 'caseObj' completo si solo tenemos ID.
      // En este caso, el endpoint de alertas devuelve el modelo CaseAlerta, que tiene 'caso' como ID.
      // Necesitamos el 'caratula' y 'codigo_interno' para mostrar bien.
      // La solución ideal es que el serializer del endpoint /alertas/ incluya depth o campos extra.
      // Por ahora, asumiremos que el backend no cambió el serializer default, que es simple.
      // Vamos a confiar en que el renderizado maneje la info disponible.

      // NOTA: Para que funcione perfecto, el backend CaseAlertaSerializer debería traer 'caratula'.
      // Vamos a asumir que lo agregamos o que aceptamos visualización parcial.

      setDisplayedAlerts(prev => [...prev, ...unique]);
      setAlertsPage(nextPage);
      if (!next) setHasMoreAlerts(false);
    } catch (e) {
      console.error(e);
      setHasMoreAlerts(false);
    } finally {
      setLoadingMoreAlerts(false);
    }
  };

  const loadMoreCases = async () => {
    if (loadingMoreCases || !hasMoreCases) return;
    setLoadingMoreCases(true);
    try {
      const nextPage = casesPage + 1;
      const { results, next } = await api.apiGetCases({}, nextPage);

      const currentIds = new Set(displayedCases.map(c => c.id));
      const unique = results.filter(c => !currentIds.has(c.id));

      setDisplayedCases(prev => [...prev, ...unique]);
      setCasesPage(nextPage);
      if (!next) setHasMoreCases(false);
    } catch (e) {
      console.error(e);
      setHasMoreCases(false);
    } finally {
      setLoadingMoreCases(false);
    }
  };

  const loadMoreActivities = async () => {
    if (loadingMoreActivities || !hasMoreActivities) return;
    setLoadingMoreActivities(true);
    try {
      const { results, next } = await api.apiGetDashboardActivities(activitiesPage);
      setExtraActivities(prev => [...prev, ...results]);
      setActivitiesPage(p => p + 1);
      setHasMoreActivities(Boolean(next));
    } catch (e) {
      console.error(e);
      setHasMoreActivities(false);
    } finally {
      setLoadingMoreActivities(false);
    }
  };

  const calculateUrgency = (fechaVencimiento: string) => {
    const target = new Date(fechaVencimiento);
    const diffMs = target.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 0) return { label: 'Vencido', text: 'text-red-600' };
    if (diffHours < 24) return { label: 'Hoy', text: 'text-red-500 font-black' };
    if (diffHours < 72) return { label: 'Urgente', text: 'text-orange-500' };
    return { label: 'Pendiente', text: 'text-slate-500' };
  };

  const handleToggleAlerta = async (e: React.MouseEvent, alertaId: string) => {
    e.stopPropagation();
    try {
      const updatedAlerta = await api.apiToggleAlerta(String(alertaId));
      // Actualizar el dashboard localmente (evita PATCH del caso completo)
      setDashboardStats(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          alertas: (prev.alertas || []).map((a: any) =>
            String(a.id) === String(alertaId) ? { ...a, ...updatedAlerta } : a
          ),
        };
      });
      // También actualizar la lista lazy
      setDisplayedAlerts(prev => prev.map(a => String(a.id) === String(alertaId) ? { ...a, ...updatedAlerta } : a));
    } catch (error) {
      console.error('Error al actualizar alerta:', error);
      alert('Error al actualizar la tarea/alerta. Por favor, intenta nuevamente.');
    }
  };

  // Usar alertas del dashboard si están disponibles, sino de los casos.
  // Normalizar para asegurar que siempre exista caseObj para navegar.
  const allAlertsRaw: any[] =
    (dashboardStats?.alertas as any[]) ||
    casesArray.flatMap(c => (c.alertas || []).map(a => ({ ...a, caratula: c.caratula, caseObj: c })));

  const allAlerts: any[] = allAlertsRaw.map((a) => {
    if (a?.caseObj) return a;
    const caseId = a?.case_id ?? a?.caso_id ?? a?.caso;
    const found = caseId ? casesArray.find(c => String(c.id) === String(caseId)) : undefined;
    return {
      ...a,
      caratula: a?.caratula ?? found?.caratula,
      caseObj: found ?? (caseId ? ({ id: String(caseId) } as any) : undefined),
    };
  });

  const sortedAlerts = [...allAlerts].sort((a, b) => {
    if (a.cumplida !== b.cumplida) return a.cumplida ? 1 : -1;
    return new Date(a.fecha_vencimiento).getTime() - new Date(b.fecha_vencimiento).getTime();
  });

  // Usar casos recientes del dashboard si están disponibles
  const recentCases = dashboardStats?.recent_cases || [...casesArray].sort((a, b) => {
    const dateA = new Date(b.updated_at || b.updatedAt || '').getTime();
    const dateB = new Date(a.updated_at || a.updatedAt || '').getTime();
    return dateA - dateB;
  }).slice(0, 5);

  const stats = dashboardStats?.stats || {
    total_cases: casesArray.length,
    open_cases: casesArray.filter(c => c.estado === CaseStatus.OPEN).length,
    closed_cases: casesArray.filter(c => c.estado === CaseStatus.CLOSED).length,
    horas_trabajadas_cumplidas_minutos: 0,
    horas_trabajadas_total_minutos: 0,
  };

  if (loading && !loadError) {
    return (
      <div className="space-y-8 animate-fadeIn">
        <header className="flex flex-col md:flex-row gap-6 border-b border-slate-200 pb-8">
          <div className="flex-1 h-32 bg-slate-200/60 rounded-[2rem] animate-pulse" />
          <div className="h-24 w-48 bg-slate-200/60 rounded-[2rem] animate-pulse" />
        </header>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-slate-100 p-6 rounded-2xl border border-slate-100 h-24 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-4">
            <div className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
            <div className="h-96 bg-slate-100 rounded-2xl animate-pulse" />
          </div>
          <div className="lg:col-span-2 h-[70vh] bg-slate-100 rounded-[2.5rem] animate-pulse" />
        </div>
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent" />
          <span className="ml-2 text-sm text-slate-500">Cargando datos...</span>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <p className="text-slate-600 mb-4">{loadError}</p>
          <button
            onClick={loadData}
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-xl transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      <header className="flex flex-col md:flex-row gap-6 border-b border-slate-200 pb-8">
        <div className="flex-1">
          {/* Si hay aviso, mostrarlo. Si no, mensaje default o nada. Si es admin, botón editar. */}
          <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <svg className="w-32 h-32" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
            </div>

            {editingAviso ? (
              <div className="relative z-10 w-full">
                <textarea
                  className="w-full bg-black/30 border border-white/20 rounded-xl p-4 text-white placeholder-white/30 focus:outline-none focus:border-orange-500 mb-2 h-24"
                  value={avisoContent}
                  onChange={(e) => setAvisoContent(e.target.value)}
                  placeholder="Escribe un anuncio importante..."
                />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setEditingAviso(false)} className="text-xs text-slate-300 hover:text-white mr-2">Cancelar</button>
                  <button onClick={handleSaveAviso} className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest">Publicar</button>
                </div>
              </div>
            ) : (
              <div className="relative z-10 pr-10">
                <p className="text-orange-500 text-[10px] font-black uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                  Anuncios del Estudio
                </p>
                <h2 className="text-2xl md:text-3xl font-serif font-medium leading-tight opacity-90">
                  {dashboardStats?.aviso?.contenido || "Bienvenido al Sistema de Gestión de Expedientes Neira Trujillo v5.0"}
                </h2>
                {/* Solo mostrar footer de autor si hay aviso real */}
                {dashboardStats?.aviso && (
                  <p className="mt-4 text-[10px] text-slate-500 font-mono uppercase">
                    Publicado el {new Date(dashboardStats.aviso.created_at).toLocaleDateString()}
                  </p>
                )}

                {/* Botón Editar solo si isAdmin (usamos una prop o checkeamos user desde localStorage/context, aquí asumiremos que pasamos user o checkeamos api) */}
                {/* Como no tengo user prop directo aquí, podemos usar un check rápido si 'onUpdateCase' viniera del padre con user, 
                        o podemos implementar un simple check de localStorage 'current_user' is_admin como en apiService 
                    */}
                <button
                  onClick={() => {
                    const user = JSON.parse(localStorage.getItem('current_user') || '{}');
                    if (user.isAdmin || user.is_admin) setEditingAviso(true);
                  }}
                  className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity bg-white/10 hover:bg-white/20 p-2 rounded-lg text-white"
                  title="Editar Anuncio (Solo Admin)"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col justify-center">
          <button
            onClick={() => onViewChange('new-case')}
            className="bg-white hover:bg-slate-50 text-slate-900 font-black px-8 py-6 rounded-[2rem] transition-all flex items-center shadow-lg hover:shadow-xl border border-slate-100 uppercase tracking-widest text-[10px] transform active:scale-95 group"
          >
            <div className="bg-zinc-900 text-white w-8 h-8 rounded-full flex items-center justify-center mr-3 group-hover:bg-orange-600 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
            </div>
            Nuevo Expediente
          </button>
        </div>
      </header>

      {/* Estadísticas Rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total</p>
          <p className="text-3xl font-black text-slate-900">{stats.total_cases}</p>
        </div>
        <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 shadow-sm">
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">Abiertos</p>
          <p className="text-3xl font-black text-blue-600">{stats.open_cases}</p>
        </div>
        <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 shadow-sm">
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Horas Cumplidas</p>
          <p className="text-3xl font-black text-emerald-600">{formatMinutosAHoras(stats.horas_trabajadas_cumplidas_minutos)}</p>
        </div>
        <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 shadow-sm">
          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">Horas Totales</p>
          <p className="text-3xl font-black text-indigo-600">{formatMinutosAHoras(stats.horas_trabajadas_total_minutos)}</p>
        </div>
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Cerrados</p>
          <p className="text-3xl font-black text-slate-600">{stats.closed_cases}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4 flex flex-col">
          <DashboardStickyNotes initialNotes={dashboardStats?.sticky_notes} todayEvents={dashboardStats?.today_events} />
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col max-h-[30vh] overflow-hidden">
            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] mb-4 flex items-center justify-between sticky top-0 bg-white pb-2 border-b border-slate-50">
              Plazos
              <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded-lg text-[9px]">{sortedAlerts.filter(a => !a.cumplida).length}</span>
            </h3>
            <div
              className="space-y-3 overflow-y-auto custom-scrollbar pr-2"
              onScroll={(e) => {
                const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
                if (scrollHeight - scrollTop <= clientHeight + 50) { // 50px threshold
                  loadMoreAlerts();
                }
              }}
            >
              {displayedAlerts.map(alerta => {
                const urgency = calculateUrgency(alerta.fecha_vencimiento);
                // Intento de obtener caratula: del objeto mismo (API alertas) o buscando en cases (si disponible) o del dashboard serializer anterior
                // El endpoint /alertas/ devuelve { caso: ID, ... }. Necesitamos buscar la info si no está plana.
                // Si viene del DashboardAlertaSerializer tiene 'caratula'.
                // Si viene del normal, tiene 'caso' como ID.
                let caratula = alerta.caratula;
                let codigo = alerta.codigo_interno;

                if (!caratula && alerta.caso && typeof alerta.caso === 'number') {
                  // Buscar en nuestros cases cargados si tenemos suerte
                  const found = cases.find(c => Number(c.id) === alerta.caso);
                  if (found) { caratula = found.caratula; codigo = found.codigo_interno; }
                }

                // Resolver caseObj para click (navegación)
                const caseId = alerta.case_id ?? (typeof alerta.caso === 'number' ? alerta.caso : null);
                const caseObj = alerta.caseObj
                  || (caseId ? { id: caseId, caratula, codigo_interno: codigo } as LawCase : undefined)
                  || (alerta.caso && typeof alerta.caso === 'number' ? cases.find(c => Number(c.id) === alerta.caso) : undefined);

                return (
                  <div key={alerta.id} onClick={() => caseObj && onSelectCase(caseObj)} className={`alert-card group cursor-pointer p-5 rounded-[2rem] border transition-all ${alerta.cumplida ? 'alert-completed border-slate-100' : 'bg-slate-50 border-slate-100 shadow-sm'}`}>
                    <div className="flex justify-between items-start">
                      <span className={`text-[9px] font-black uppercase tracking-widest ${alerta.cumplida ? 'text-slate-400' : urgency.text}`}>
                        {alerta.cumplida ? '● Finalizada' : urgency.label}
                      </span>
                      {currentUser?.is_admin ? (
                        <span className="text-[7px] font-bold text-slate-300 uppercase tracking-wider border border-slate-100 px-2 py-1 rounded-lg bg-slate-50/80" title="El admin solo puede consultar plazos">
                          Solo consulta
                        </span>
                      ) : (
                        <button
                          onClick={(e) => handleToggleAlerta(e, alerta.id)}
                          className={`text-[8px] font-black uppercase border px-3 py-1 rounded-xl transition-all ${alerta.cumplida ? 'text-orange-500 border-orange-200 bg-white' : 'text-slate-400 border-slate-200 bg-white hover:text-green-600 hover:border-green-100'}`}
                        >
                          {alerta.cumplida ? 'Reabrir' : 'Listo ✓'}
                        </button>
                      )}
                    </div>
                    <p className={`text-sm font-bold mt-3 leading-tight tracking-tight ${alerta.cumplida ? 'line-through text-slate-400' : 'text-slate-800'}`}>{alerta.titulo}</p>
                    <div className="flex justify-between mt-3 pt-3 border-t border-slate-100/50 items-center">
                      <p className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-tighter">{alerta.fecha_vencimiento} | {alerta.hora || '--:--'}</p>
                      <p className="text-[8px] text-slate-300 font-black uppercase truncate max-w-[80px]">{caratula || codigo || 'Expediente...'}</p>
                    </div>
                    {alerta.cumplida && (alerta.completed_by_username || alerta.completedBy) && (
                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <p className="text-[8px] font-black text-green-600 uppercase italic">
                          Acción de @{alerta.completed_by_username || alerta.completedBy || 'sistema'}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
              {loadingMoreAlerts && (
                <div className="p-4 text-center">
                  <span className="animate-spin inline-block rounded-full h-4 w-4 border-2 border-orange-500 border-t-transparent"></span>
                </div>
              )}
              {displayedAlerts.length === 0 && (
                <div className="py-20 text-center text-slate-300 flex flex-col items-center">
                  <svg className="w-12 h-12 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" /></svg>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em]">Agenda de plazos vacía</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col max-h-[55vh]">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Trazabilidad</h3>
              {currentUser?.is_admin && (
                <button
                  onClick={async () => {
                    if (exporting) return;
                    setExporting(true);
                    try {
                      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/dashboard/export-activities/`, {
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
                      });
                      if (!response.ok) throw new Error('Error al exportar');
                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'trazabilidad.xlsx';
                      a.click();
                      window.URL.revokeObjectURL(url);
                    } catch (e) {
                      console.error('Error exportando:', e);
                      alert('Error al exportar trazabilidad');
                    } finally {
                      setExporting(false);
                    }
                  }}
                  disabled={exporting}
                  title="Exportar Excel"
                  className={`p-1.5 rounded-lg transition-all ${exporting ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 hover:bg-emerald-100 text-slate-400 hover:text-emerald-600'}`}
                >
                  {exporting ? (
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  )}
                </button>
              )}
            </div>
            <span className="text-[8px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-100 uppercase">
              {displayedActivities.length > 0 ? `${displayedActivities.length} acts` : `${displayedCases.length} casos`}
            </span>
          </div>
          <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-white shadow-sm z-10">
                <tr className="text-[9px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <th className="px-3 py-2">Expediente</th>
                  <th className="px-3 py-2">Acción</th>
                  <th className="px-3 py-2">Entidad</th>
                  <th className="px-3 py-2">Usuario</th>
                  <th className="px-3 py-2">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(() => {
                  // Obtener IDs de casos que ya tienen actividad
                  const caseIdsWithActivity = new Set(
                    displayedActivities.map((a: any) => a.caso?.id || a.caso)
                  );

                  // Casos sin actividad reciente
                  const casesWithoutActivity = (displayedCases || []).filter(
                    (c: LawCase) => !caseIdsWithActivity.has(c.id)
                  );

                  // Crear registros de actividades
                  const activityRows = displayedActivities.map((activity: any) => ({
                    id: `activity-${activity.id}`,
                    caso: activity.caso || { id: activity.caso_id, codigo_interno: '-', caratula: 'Sin expediente' },
                    action: activity.action,
                    entity_type: activity.entity_type,
                    description: activity.description,
                    user_username: activity.user_username,
                    created_at: activity.created_at,
                    isActivity: true
                  }));

                  // Crear registros de casos sin actividad
                  const caseRows = casesWithoutActivity.map((c: LawCase) => ({
                    id: `case-${c.id}`,
                    caso: { id: c.id, codigo_interno: c.codigo_interno, caratula: c.caratula },
                    action: null,
                    entity_type: 'LawCase',
                    description: 'Sin actividad registrada',
                    user_username: c.last_modified_by_username || 'sistema',
                    created_at: c.updated_at || c.created_at,
                    isActivity: false
                  }));

                  // Combinar y ordenar por fecha (más reciente primero)
                  const allRows = [...activityRows, ...caseRows].sort((a, b) => {
                    const dateA = new Date(a.created_at || 0).getTime();
                    const dateB = new Date(b.created_at || 0).getTime();
                    return dateB - dateA;
                  });

                  const getActionBadge = (action: string | null) => {
                    if (!action) {
                      return <span className="text-[8px] font-black px-2 py-0.5 rounded bg-slate-100 text-slate-400">—</span>;
                    }
                    const styles: Record<string, string> = {
                      create: 'bg-emerald-100 text-emerald-700',
                      update: 'bg-blue-100 text-blue-700',
                      delete: 'bg-red-100 text-red-700',
                      toggle: 'bg-orange-100 text-orange-700',
                    };
                    const labels: Record<string, string> = {
                      create: 'Crear',
                      update: 'Editar',
                      delete: 'Eliminar',
                      toggle: 'Cambiar',
                    };
                    return (
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded ${styles[action] || 'bg-slate-100 text-slate-600'}`}>
                        {labels[action] || action}
                      </span>
                    );
                  };

                  const getEntityBadge = (entityType: string) => {
                    const styles: Record<string, string> = {
                      CaseActuacion: 'bg-purple-50 text-purple-600 border-purple-100',
                      CaseAlerta: 'bg-amber-50 text-amber-600 border-amber-100',
                      CaseNote: 'bg-cyan-50 text-cyan-600 border-cyan-100',
                      Cliente: 'bg-pink-50 text-pink-600 border-pink-100',
                      LawCase: 'bg-zinc-100 text-zinc-700 border-zinc-200',
                    };
                    const labels: Record<string, string> = {
                      CaseActuacion: 'Actuación',
                      CaseAlerta: 'Alerta',
                      CaseNote: 'Nota',
                      Cliente: 'Cliente',
                      LawCase: 'Expediente',
                    };
                    return (
                      <span className={`text-[7px] font-bold px-1.5 py-0.5 rounded border ${styles[entityType] || 'bg-slate-50 text-slate-500'}`}>
                        {labels[entityType] || entityType}
                      </span>
                    );
                  };

                  return (
                    <>
                      {allRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition-all cursor-pointer group" onClick={() => {
                      if (row.caso?.id) {
                        const caseItem = displayedCases?.find((c: LawCase) => c.id === row.caso?.id);
                        if (caseItem) onSelectCase(caseItem);
                      }
                    }}>
                      <td className="px-3 py-2">
                        <p className="text-[9px] font-black text-orange-600">{row.caso?.codigo_interno || '-'}</p>
                        <p className="text-xs font-bold text-slate-800 line-clamp-1 group-hover:text-orange-600 transition-colors uppercase tracking-tighter">{row.caso?.caratula || '-'}</p>
                      </td>
                      <td className="px-3 py-2">
                        {getActionBadge(row.action)}
                      </td>
                      <td className="px-3 py-2">
                        {getEntityBadge(row.entity_type)}
                        {row.description && row.isActivity && (
                          <p className="text-[9px] text-slate-600 mt-0.5 line-clamp-1 max-w-[180px]">{row.description}</p>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-lg bg-zinc-950 flex items-center justify-center text-[7px] text-orange-500 font-black">@</div>
                          <span className="text-[9px] font-black text-slate-600 uppercase tracking-tighter">{row.user_username}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <p className="text-[9px] text-slate-400 font-mono font-bold uppercase tracking-tighter">
                          {(() => {
                            const date = new Date(row.created_at);
                            return isNaN(date.getTime()) ? '-' : date.toLocaleDateString();
                          })()}
                        </p>
                        <p className="text-[8px] text-slate-300">
                          {(() => {
                            const date = new Date(row.created_at);
                            return isNaN(date.getTime()) ? '' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                          })()}
                        </p>
                      </td>
                    </tr>
                  ))}
                      {hasMoreActivities && (
                        <tr>
                          <td colSpan={5} className="px-3 py-2 bg-slate-50/50 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={loadMoreActivities}
                              disabled={loadingMoreActivities}
                              className="w-full py-2 text-[9px] font-bold text-orange-600 hover:text-orange-700 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
                            >
                              {loadingMoreActivities ? 'Cargando…' : 'Cargar más actividades'}
                            </button>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })()}

                {displayedActivities.length === 0 && (displayedCases?.length === 0 || !displayedCases) && (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-400">
                      <p className="text-[10px] font-black uppercase tracking-widest">Sin registros</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {dashboardStats && (
          <>
            {dashboardStats.stats_by_fuero && Object.keys(dashboardStats.stats_by_fuero).length > 0 && (
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-wider mb-3">Por Fuero</h3>
                <div className="space-y-2">
                  {Object.entries(dashboardStats.stats_by_fuero).map(([fuero, count]) => {
                    const total = (Object.values(dashboardStats.stats_by_fuero) as number[]).reduce((a, b) => a + b, 0);
                    const percentage = total > 0 ? (count / total) * 100 : 0;
                    return (
                      <div key={fuero}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-bold text-slate-700">{fuero}</span>
                          <span className="text-[10px] font-black text-slate-900">{count}</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5">
                          <div
                            className="bg-orange-500 h-1.5 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {dashboardStats.stats_by_abogado && Object.keys(dashboardStats.stats_by_abogado).length > 0 && (
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-wider mb-3">Por Abogado</h3>
                <div className="space-y-2">
                  {Object.entries(dashboardStats.stats_by_abogado)
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                    .slice(0, 5)
                    .map(([abogado, count]) => (
                      <div key={abogado} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                        <span className="text-[10px] font-bold text-slate-700 truncate flex-1">{abogado || 'Sin asignar'}</span>
                        <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded">{count}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div >
  );
};

export default Dashboard;
