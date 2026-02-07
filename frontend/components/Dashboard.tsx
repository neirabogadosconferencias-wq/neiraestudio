
import React, { useState, useEffect } from 'react';
import { LawCase, CaseStatus, CasePriority, ViewState, DashboardStats } from '../types';
import * as api from '../services/apiService';

interface DashboardProps {
  cases: LawCase[];
  onViewChange: (view: ViewState) => void;
  onSelectCase: (lawCase: LawCase) => void;
  onUpdateCase: (updatedCase: LawCase) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ cases, onViewChange, onSelectCase, onUpdateCase }) => {
  const now = new Date();
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingAviso, setEditingAviso] = useState(false);
  const [avisoContent, setAvisoContent] = useState('');

  useEffect(() => {
    if (dashboardStats?.aviso) {
      setAvisoContent(dashboardStats.aviso.contenido);
    }
  }, [dashboardStats]);

  const handleSaveAviso = async () => {
    try {
      await api.apiCreateAviso(avisoContent);
      setEditingAviso(false);
      // Recargar stats de dashboard para obtener el nuevo aviso
      const stats = await api.apiGetDashboard();
      setDashboardStats(stats);
    } catch (e) {
      alert('Error al guardar aviso');
    }
  };

  // Lazy Loading States
  const [displayedAlerts, setDisplayedAlerts] = useState<any[]>([]);
  const [alertsPage, setAlertsPage] = useState(1);
  const [hasMoreAlerts, setHasMoreAlerts] = useState(true);
  const [loadingMoreAlerts, setLoadingMoreAlerts] = useState(false);

  const [displayedCases, setDisplayedCases] = useState<LawCase[]>([]);
  const [casesPage, setCasesPage] = useState(1);
  const [hasMoreCases, setHasMoreCases] = useState(true);
  const [loadingMoreCases, setLoadingMoreCases] = useState(false);

  // Asegurar que cases sea un array
  const casesArray = Array.isArray(cases) ? cases : [];

  useEffect(() => {
    const loadData = async () => {
      try {
        const stats = await api.apiGetDashboard();
        setDashboardStats(stats);

        // Inicializar listas lazy con lo que trajo el dashboard (primeras 5)
        if (stats.alertas) {
          setDisplayedAlerts(stats.alertas);
          setHasMoreAlerts(true); // Asumimos que hay más si llenamos el cupo
        }
        if (stats.recent_cases) {
          setDisplayedCases(stats.recent_cases as unknown as LawCase[]);
          setHasMoreCases(true);
        }
      } catch (error) {
        console.error('Error al cargar datos del dashboard:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const loadMoreAlerts = async () => {
    if (loadingMoreAlerts || !hasMoreAlerts) return;
    setLoadingMoreAlerts(true);
    try {
      const nextPage = alertsPage + 1;
      const { results, next } = await api.apiGetAlertasPaginated(nextPage);

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
    in_progress_cases: casesArray.filter(c => c.estado === CaseStatus.IN_PROGRESS).length,
    paused_cases: casesArray.filter(c => c.estado === CaseStatus.PAUSED).length,
    closed_cases: casesArray.filter(c => c.estado === CaseStatus.CLOSED).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-slate-600">Cargando dashboard...</p>
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
        <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100 shadow-sm">
          <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-2">En Trámite</p>
          <p className="text-3xl font-black text-orange-600">{stats.in_progress_cases}</p>
        </div>
        <div className="bg-yellow-50 p-6 rounded-2xl border border-yellow-100 shadow-sm">
          <p className="text-[10px] font-black text-yellow-600 uppercase tracking-widest mb-2">Pausados</p>
          <p className="text-3xl font-black text-yellow-600">{stats.paused_cases}</p>
        </div>
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Cerrados</p>
          <p className="text-3xl font-black text-slate-600">{stats.closed_cases}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col h-[70vh]">
            <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] mb-8 flex items-center justify-between sticky top-0 bg-white pb-2 z-10 border-b border-slate-50">
              Control de Plazos
              <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-lg text-[9px]">{sortedAlerts.filter(a => !a.cumplida).length} Pendientes</span>
            </h3>
            <div
              className="space-y-4 overflow-y-auto custom-scrollbar pr-3"
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

                // Resolver caseObj para click
                const caseObj = alerta.caseObj || (alerta.caso && typeof alerta.caso === 'number' ? cases.find(c => Number(c.id) === alerta.caso) : undefined);

                return (
                  <div key={alerta.id} onClick={() => caseObj && onSelectCase(caseObj)} className={`alert-card group cursor-pointer p-5 rounded-[2rem] border transition-all ${alerta.cumplida ? 'alert-completed border-slate-100' : 'bg-slate-50 border-slate-100 shadow-sm'}`}>
                    <div className="flex justify-between items-start">
                      <span className={`text-[9px] font-black uppercase tracking-widest ${alerta.cumplida ? 'text-slate-400' : urgency.text}`}>
                        {alerta.cumplida ? '● Finalizada' : urgency.label}
                      </span>
                      <button
                        onClick={(e) => handleToggleAlerta(e, alerta.id)}
                        className={`text-[8px] font-black uppercase border px-3 py-1 rounded-xl transition-all ${alerta.cumplida ? 'text-orange-500 border-orange-200 bg-white' : 'text-slate-400 border-slate-200 bg-white hover:text-green-600 hover:border-green-100'}`}
                      >
                        {alerta.cumplida ? 'Reabrir' : 'Listo ✓'}
                      </button>
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

        <div className="lg:col-span-2 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col h-[70vh]">
          <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
            <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Trazabilidad de Expedientes</h3>
            <span className="text-[9px] font-bold text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-100 uppercase">Últimos movimientos</span>
          </div>
          <div
            className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar"
            onScroll={(e) => {
              const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
              if (scrollHeight - scrollTop <= clientHeight + 50) {
                loadMoreCases();
              }
            }}
          >
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-white shadow-sm z-10">
                <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <th className="px-8 py-5">Carátula / ID Interno</th>
                  <th className="px-8 py-5">Auditoría</th>
                  <th className="px-8 py-5">Sincronización</th>
                  <th className="px-8 py-5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedCases.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-all cursor-pointer group" onClick={() => onSelectCase(c)}>
                    <td className="px-8 py-6">
                      <p className="text-[10px] font-black text-orange-600 mb-1">{c.codigo_interno}</p>
                      <p className="text-sm font-bold text-slate-800 line-clamp-1 group-hover:text-orange-600 transition-colors uppercase tracking-tighter">{c.caratula}</p>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-zinc-950 flex items-center justify-center text-[8px] text-orange-500 font-black">@</div>
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">{c.last_modified_by_username || c.lastModifiedBy || 'sistema'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-tighter">
                        {(() => {
                          const date = new Date(c.updated_at || c.updatedAt || c.created_at || Date.now());
                          return isNaN(date.getTime()) ? 'Fecha inválida' : date.toLocaleDateString();
                        })()} <br />
                        <span className="text-slate-300">
                          {(() => {
                            const date = new Date(c.updated_at || c.updatedAt || c.created_at || Date.now());
                            return isNaN(date.getTime()) ? '' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                          })()}
                        </span>
                      </p>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button className="bg-black text-white px-6 py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg hover:bg-orange-600 hover:shadow-orange-200">Ver Ficha</button>
                    </td>
                  </tr>
                ))}
                {loadingMoreCases && (
                  <tr>
                    <td colSpan={4} className="text-center py-4">
                      <span className="animate-spin inline-block rounded-full h-4 w-4 border-2 border-orange-500 border-t-transparent"></span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Gráficos y Estadísticas */}
      {
        dashboardStats && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Gráfico por Fuero */}
            {dashboardStats.stats_by_fuero && Object.keys(dashboardStats.stats_by_fuero).length > 0 && (
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Casos por Fuero</h3>
                <div className="space-y-3">
                  {Object.entries(dashboardStats.stats_by_fuero).map(([fuero, count]) => {
                    const total = (Object.values(dashboardStats.stats_by_fuero) as number[]).reduce((a, b) => a + b, 0);
                    const percentage = total > 0 ? (count / total) * 100 : 0;
                    return (
                      <div key={fuero}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold text-slate-700">{fuero}</span>
                          <span className="text-xs font-black text-slate-900">{count}</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2">
                          <div
                            className="bg-orange-500 h-2 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Gráfico por Abogado */}
            {dashboardStats.stats_by_abogado && Object.keys(dashboardStats.stats_by_abogado).length > 0 && (
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Casos por Abogado</h3>
                <div className="space-y-2">
                  {Object.entries(dashboardStats.stats_by_abogado)
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                    .slice(0, 5)
                    .map(([abogado, count]) => (
                      <div key={abogado} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                        <span className="text-xs font-bold text-slate-700 truncate flex-1">{abogado || 'Sin asignar'}</span>
                        <span className="text-xs font-black text-orange-600 bg-orange-50 px-2 py-1 rounded">{count}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )
      }
    </div >
  );
};

export default Dashboard;
