import React, { useState, useEffect } from 'react';
import { LawCase, CaseAlerta, ViewState } from '../types';
import * as api from '../services/apiService';

interface CalendarProps {
  cases: LawCase[];
  onSelectCase: (lawCase: LawCase) => void;
  onViewChange: (view: ViewState) => void;
}

const Calendar: React.FC<CalendarProps> = ({ cases, onSelectCase, onViewChange }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Asegurar que cases sea un array
  const casesArray = Array.isArray(cases) ? cases : [];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Obtener todas las alertas de todos los casos
  const allAlerts = casesArray.flatMap(c => 
    (c.alertas || [])
      .filter(a => a.fecha_vencimiento) // Filtrar alertas sin fecha
      .map(a => {
        try {
          return {
            ...a,
            caratula: c.caratula || 'Sin carátula',
            caseObj: c,
            date: new Date(a.fecha_vencimiento)
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean) // Eliminar nulls
  );

  // Obtener todas las actuaciones
  const allActuaciones = casesArray.flatMap(c =>
    (c.actuaciones || [])
      .filter(a => a.fecha) // Filtrar actuaciones sin fecha
      .map(a => {
        try {
          return {
            ...a,
            caratula: c.caratula || 'Sin carátula',
            caseObj: c,
            date: new Date(a.fecha)
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean) // Eliminar nulls
  );

  // Función para normalizar fecha a formato YYYY-MM-DD
  const normalizeDate = (dateInput: string | Date): string => {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Función para obtener eventos de un día específico
  const getEventsForDate = (date: Date) => {
    const dateStr = normalizeDate(date);
    if (!dateStr) return { alerts: [], actuaciones: [] };
    
    const alerts = allAlerts.filter(a => {
      if (!a.fecha_vencimiento) return false;
      const alertDate = normalizeDate(a.fecha_vencimiento);
      return alertDate === dateStr;
    });
    
    const actuaciones = allActuaciones.filter(a => {
      if (!a.fecha) return false;
      const actuacionDate = normalizeDate(a.fecha);
      return actuacionDate === dateStr;
    });
    
    return { alerts, actuaciones };
  };

  // Navegación de mes
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Generar días del mes
  const getDaysInMonth = () => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Días del mes anterior para completar la semana
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false
      });
    }
    
    // Días del mes actual
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        date: new Date(year, month, day),
        isCurrentMonth: true
      });
    }
    
    // Días del mes siguiente para completar la semana (6 semanas = 42 días)
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        date: new Date(year, month + 1, day),
        isCurrentMonth: false
      });
    }
    
    return days;
  };

  const days = getDaysInMonth();
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    return selectedDate && date.toDateString() === selectedDate.toDateString();
  };

  const getUrgencyColor = (fechaVencimiento: string) => {
    try {
      const target = new Date(fechaVencimiento);
      if (isNaN(target.getTime())) return 'bg-slate-400';
      
      const now = new Date();
      const diffMs = target.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      
      if (diffHours < 0) return 'bg-red-500';
      if (diffHours < 24) return 'bg-red-400';
      if (diffHours < 72) return 'bg-orange-400';
      return 'bg-blue-400';
    } catch {
      return 'bg-slate-400';
    }
  };

  // Estadísticas rápidas
  const totalAlerts = allAlerts.length;
  const pendingAlerts = allAlerts.filter(a => !a.cumplida).length;
  const totalActuaciones = allActuaciones.length;

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-serif font-bold text-slate-900">Calendario de Actividades</h2>
          <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">
            {totalAlerts} alertas • {pendingAlerts} pendientes • {totalActuaciones} actuaciones
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              // Por ahora solo cambia el texto, la vista semanal se implementará después
              alert('Vista semanal próximamente disponible');
            }}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold transition-all opacity-50 cursor-not-allowed"
            title="Próximamente"
          >
            Vista Semanal
          </button>
          <button
            onClick={goToToday}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all"
          >
            Hoy
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Header del Calendario */}
        <div className="bg-zinc-900 text-white p-6 flex items-center justify-between">
          <button
            onClick={goToPreviousMonth}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <h3 className="text-xl font-black uppercase tracking-wider">
            {monthNames[month]} {year}
          </h3>
          <button
            onClick={goToNextMonth}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
            </svg>
          </button>
        </div>

        {/* Días de la semana */}
        <div className="grid grid-cols-7 border-b border-slate-200">
          {dayNames.map(day => (
            <div key={day} className="p-4 text-center bg-slate-50 border-r border-slate-200 last:border-r-0">
              <span className="text-xs font-black text-slate-600 uppercase tracking-widest">{day}</span>
            </div>
          ))}
        </div>

        {/* Días del mes */}
        <div className="grid grid-cols-7">
          {days.map((day, index) => {
            const events = getEventsForDate(day.date);
            const hasAlerts = events.alerts.length > 0;
            const hasActuaciones = events.actuaciones.length > 0;
            const isCurrentDay = isToday(day.date);
            const isSelectedDay = isSelected(day.date);

            return (
              <div
                key={index}
                onClick={() => setSelectedDate(day.date)}
                className={`
                  min-h-[100px] p-2 border-r border-b border-slate-200 cursor-pointer transition-all
                  ${!day.isCurrentMonth ? 'bg-slate-50 text-slate-400' : 'bg-white hover:bg-slate-50'}
                  ${isCurrentDay ? 'ring-2 ring-orange-500' : ''}
                  ${isSelectedDay ? 'bg-orange-50' : ''}
                `}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-bold ${isCurrentDay ? 'bg-orange-500 text-white px-2 py-0.5 rounded' : ''}`}>
                    {day.date.getDate()}
                  </span>
                  {(hasAlerts || hasActuaciones) && (
                    <div className="flex gap-1">
                      {hasAlerts && (
                        <div className="flex gap-0.5">
                          {events.alerts.slice(0, 3).map((alerta, idx) => (
                            <div
                              key={alerta.id || idx}
                              className={`w-1.5 h-1.5 rounded-full ${alerta.cumplida ? 'bg-slate-300' : getUrgencyColor(alerta.fecha_vencimiento)}`}
                              title={alerta.titulo || 'Alerta'}
                            />
                          ))}
                          {events.alerts.length > 3 && (
                            <span className="text-[8px] font-black text-slate-400">+{events.alerts.length - 3}</span>
                          )}
                        </div>
                      )}
                      {hasActuaciones && (
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" title={`${events.actuaciones.length} actuación(es)`} />
                      )}
                    </div>
                  )}
                </div>
                
                {/* Eventos del día (solo mostrar algunos) */}
                {isSelectedDay && (hasAlerts || hasActuaciones) && (
                  <div className="mt-2 space-y-1">
                    {events.alerts.slice(0, 2).map(alerta => (
                      <div
                        key={alerta.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (alerta.caseObj && alerta.caseObj.id) {
                            onSelectCase(alerta.caseObj);
                          }
                        }}
                        className={`text-[9px] p-1 rounded ${alerta.cumplida ? 'bg-slate-100 text-slate-500' : 'bg-red-50 text-red-700'} font-bold truncate cursor-pointer hover:opacity-80`}
                        title={alerta.titulo || 'Sin título'}
                      >
                        {alerta.titulo || 'Sin título'}
                      </div>
                    ))}
                    {events.alerts.length > 2 && (
                      <div className="text-[8px] text-slate-400 font-bold">
                        +{events.alerts.length - 2} más
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Panel de eventos del día seleccionado */}
      {selectedDate && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black text-slate-900 uppercase">
              {selectedDate.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </h3>
            <button
              onClick={() => setSelectedDate(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {(() => {
            const events = getEventsForDate(selectedDate);
            const allEvents = [...events.alerts, ...events.actuaciones];
            
            if (allEvents.length === 0) {
              return (
                <div className="text-center py-8 text-slate-400">
                  <p className="text-sm font-bold">No hay eventos programados para este día</p>
                </div>
              );
            }

            return (
              <div className="space-y-4">
                {events.alerts.length > 0 && (
                  <div>
                    <h4 className="text-xs font-black text-slate-600 uppercase tracking-widest mb-2">
                      Alertas / Plazos ({events.alerts.length})
                    </h4>
                    <div className="space-y-2">
                      {events.alerts.map(alerta => {
                        const isVencido = (() => {
                          try {
                            return new Date(alerta.fecha_vencimiento).getTime() < new Date().getTime();
                          } catch {
                            return false;
                          }
                        })();
                        
                        return (
                          <div
                            key={alerta.id}
                            onClick={() => {
                              if (alerta.caseObj && alerta.caseObj.id) {
                                onSelectCase(alerta.caseObj);
                              }
                            }}
                            className={`p-4 rounded-xl border cursor-pointer transition-all ${
                              alerta.cumplida 
                                ? 'bg-slate-50 border-slate-200' 
                                : 'bg-red-50 border-red-200 hover:bg-red-100'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className={`text-sm font-bold ${alerta.cumplida ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                                  {alerta.titulo || 'Sin título'}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">{alerta.caratula || 'Sin carátula'}</p>
                                {alerta.hora && (
                                  <p className="text-xs font-mono text-slate-400 mt-1">{alerta.hora}</p>
                                )}
                              </div>
                              {!alerta.cumplida && (
                                <span className={`px-2 py-1 rounded text-[9px] font-black text-white ${getUrgencyColor(alerta.fecha_vencimiento)}`}>
                                  {isVencido ? 'Vencido' : 'Pendiente'}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {events.actuaciones.length > 0 && (
                  <div>
                    <h4 className="text-xs font-black text-slate-600 uppercase tracking-widest mb-2">
                      Actuaciones ({events.actuaciones.length})
                    </h4>
                    <div className="space-y-2">
                      {events.actuaciones.map(actuacion => (
                        <div
                          key={actuacion.id}
                          onClick={() => {
                            if (actuacion.caseObj && actuacion.caseObj.id) {
                              onSelectCase(actuacion.caseObj);
                            }
                          }}
                          className="p-4 rounded-xl border border-blue-200 bg-blue-50 cursor-pointer hover:bg-blue-100 transition-all"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-xs font-black text-blue-600 uppercase">{actuacion.tipo || 'Sin tipo'}</p>
                              <p className="text-sm font-bold text-slate-900 mt-1">{actuacion.descripcion || 'Sin descripción'}</p>
                              <p className="text-xs text-slate-500 mt-1">{actuacion.caratula || 'Sin carátula'}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Leyenda */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <h4 className="text-xs font-black text-slate-600 uppercase tracking-widest mb-3">Leyenda</h4>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="font-bold">Vencido</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400"></div>
            <span className="font-bold">Vence hoy</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-400"></div>
            <span className="font-bold">Urgente (3 días)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-400"></div>
            <span className="font-bold">Pendiente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="font-bold">Actuación</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Calendar;
