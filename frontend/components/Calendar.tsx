import React, { useState, useEffect, useMemo } from 'react';
import { LawCase, ViewState, CalendarEvent, CalendarEventPersonal } from '../types';
import * as api from '../services/apiService';
import EventDetailModal from './EventDetailModal';
import CalendarEventFormModal from './CalendarEventFormModal';

interface CalendarProps {
  cases?: LawCase[];
  onSelectCase: (lawCase: LawCase) => void;
  onViewChange: (view: ViewState) => void;
}

const normalizeDate = (dateInput: string | Date): string => {
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    return dateInput;
  }
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getEventFecha = (e: CalendarEvent): string =>
  e.kind === 'alerta' ? (e.fecha_vencimiento || e.fecha || '') : e.fecha || '';

const CACHE_KEY = (desde: string, hasta: string) => `${desde}_${hasta}`;

const Calendar: React.FC<CalendarProps> = ({ cases: casesProp = [], onSelectCase, onViewChange }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [eventsCache, setEventsCache] = useState<Record<string, CalendarEvent[]>>({});
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEventPersonal | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const desde = useMemo(() => {
    const d = new Date(year, month, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  }, [year, month]);
  const hasta = useMemo(() => {
    const d = new Date(year, month + 1, 0);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, [year, month]);

  const cacheKey = CACHE_KEY(desde, hasta);

  useEffect(() => {
    const cached = eventsCache[cacheKey];
    if (cached !== undefined) {
      setEvents(cached);
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .apiGetCalendarEvents(desde, hasta)
      .then((data) => {
        setEvents(data);
        setEventsCache((prev) => ({ ...prev, [cacheKey]: data }));
      })
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [desde, hasta, cacheKey]);

  const getEventsForDate = useMemo(() => {
    const alerts = events.filter((e): e is CalendarEvent & { kind: 'alerta' } => e.kind === 'alerta');
    const actuaciones = events.filter((e): e is CalendarEvent & { kind: 'actuacion' } => e.kind === 'actuacion');
    const personales = events.filter((e): e is CalendarEventPersonal => e.kind === 'personal');
    return (date: Date) => {
      const dateStr = normalizeDate(date);
      if (!dateStr) return { alerts: [] as CalendarEvent[], actuaciones: [] as CalendarEvent[], personales: [] as CalendarEvent[] };
      return {
        alerts: alerts.filter((a) => normalizeDate(a.fecha_vencimiento || a.fecha) === dateStr),
        actuaciones: actuaciones.filter((a) => normalizeDate(a.fecha) === dateStr),
        personales: personales.filter((p) => normalizeDate(p.fecha) === dateStr),
      };
    };
  }, [events]);

  const goToPreviousMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const goToNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  const getDaysInMonth = () => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    const days: { date: Date; isCurrentMonth: boolean }[] = [];
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({ date: new Date(year, month - 1, prevMonthLastDay - i), isCurrentMonth: false });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({ date: new Date(year, month, day), isCurrentMonth: true });
    }
    const remaining = 42 - days.length;
    for (let day = 1; day <= remaining; day++) {
      days.push({ date: new Date(year, month + 1, day), isCurrentMonth: false });
    }
    return days;
  };

  const days = getDaysInMonth();
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const isToday = (date: Date) => date.toDateString() === new Date().toDateString();
  const isSelected = (date: Date) =>
    selectedDate !== null && date.toDateString() === selectedDate.toDateString();

  const getUrgencyColor = (fechaVencimiento: string): string => {
    try {
      const target = new Date(fechaVencimiento);
      if (isNaN(target.getTime())) return 'bg-slate-400';
      const diffHours = (target.getTime() - Date.now()) / (1000 * 60 * 60);
      if (diffHours < 0) return 'bg-red-500';
      if (diffHours < 24) return 'bg-red-400';
      if (diffHours < 72) return 'bg-orange-400';
      return 'bg-blue-400';
    } catch {
      return 'bg-slate-400';
    }
  };

  const openEventModal = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setEventModalOpen(true);
  };

  const handleToggleAlerta = async (alertaId: string) => {
    const updated = await api.apiToggleAlerta(alertaId);
    setEvents((prev) =>
      prev.map((e) =>
        e.kind === 'alerta' && String(e.id) === alertaId ? { ...e, cumplida: updated.cumplida } : e
      )
    );
  };

  const refreshEvents = () => {
    api
      .apiGetCalendarEvents(desde, hasta)
      .then((data) => {
        setEvents(data);
        setEventsCache((prev) => ({ ...prev, [cacheKey]: data }));
      })
      .catch(() => setEvents([]));
  };

  const openCreateForm = () => {
    setEditingEvent(null);
    setFormModalOpen(true);
  };

  const openEditForm = (ev: CalendarEventPersonal) => {
    setEditingEvent(ev);
    setEventModalOpen(false);
    setFormModalOpen(true);
  };

  const handleDeletePersonal = async (eventId: string) => {
    await api.apiDeleteCalendarEvent(eventId);
    setEvents((prev) => prev.filter((e) => String(e.id) !== eventId));
  };

  const alertsCount = events.filter((e) => e.kind === 'alerta').length;
  const pendingAlerts = events.filter(
    (e) => e.kind === 'alerta' && !(e as { cumplida?: boolean }).cumplida
  ).length;
  const actuacionesCount = events.filter((e) => e.kind === 'actuacion').length;
  const personalesCount = events.filter((e) => e.kind === 'personal').length;

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-serif font-bold text-slate-900">Calendario de Actividades</h2>
          <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">
            {loading ? 'Cargando...' : `${alertsCount} alertas • ${pendingAlerts} pendientes • ${actuacionesCount} actuaciones • ${personalesCount} eventos`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={openCreateForm}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all"
          >
            + Nuevo evento
          </button>
          <button
            onClick={() => alert('Vista semanal próximamente disponible')}
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
        <div className="bg-zinc-900 text-white p-6 flex items-center justify-between">
          <button onClick={goToPreviousMonth} className="p-2 hover:bg-zinc-800 rounded-lg transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h3 className="text-xl font-black uppercase tracking-wider">
            {monthNames[month]} {year}
          </h3>
          <button onClick={goToNextMonth} className="p-2 hover:bg-zinc-800 rounded-lg transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <div className="min-w-[840px]">
            <div className="grid grid-cols-7 border-b border-slate-200">
              {dayNames.map((day) => (
                <div key={day} className="p-4 text-center bg-slate-50 border-r border-slate-200 last:border-r-0">
                  <span className="text-xs font-black text-slate-600 uppercase tracking-widest">{day}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((day, index) => {
                const dayEvents = getEventsForDate(day.date);
                const hasAlerts = dayEvents.alerts.length > 0;
                const hasActuaciones = dayEvents.actuaciones.length > 0;
                const hasPersonales = dayEvents.personales.length > 0;
                const hasAnyEvents = hasAlerts || hasActuaciones || hasPersonales;
                const isCurrentDay = isToday(day.date);
                const isSelectedDay = isSelected(day.date);

                return (
                  <div
                    key={index}
                    onClick={() => setSelectedDate(day.date)}
                    className={`
                      min-h-[80px] sm:min-h-[100px] p-2 border-r border-b border-slate-200 cursor-pointer transition-all
                      ${!day.isCurrentMonth ? 'bg-slate-50 text-slate-400' : 'bg-white hover:bg-slate-50'}
                      ${isCurrentDay ? 'ring-2 ring-orange-500' : ''}
                      ${isSelectedDay ? 'bg-orange-50' : ''}
                    `}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-bold ${isCurrentDay ? 'bg-orange-500 text-white px-2 py-0.5 rounded' : ''}`}>
                        {day.date.getDate()}
                      </span>
                      {hasAnyEvents && (
                        <span className="text-[8px] font-bold text-slate-400 bg-slate-100 px-1 rounded">
                          {dayEvents.alerts.length + dayEvents.actuaciones.length + dayEvents.personales.length}
                        </span>
                      )}
                    </div>
                    <div className="space-y-0.5">
                      {[...dayEvents.alerts, ...dayEvents.actuaciones, ...dayEvents.personales].slice(0, 2).map((ev) => (
                        <div
                          key={ev.kind + ev.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            openEventModal(ev);
                          }}
                          className={`text-[8px] px-1 py-0.5 rounded font-bold truncate cursor-pointer hover:opacity-80 ${
                            ev.kind === 'alerta' && (ev as { cumplida?: boolean }).cumplida
                              ? 'bg-slate-100 text-slate-500'
                              : ev.kind === 'alerta'
                                ? 'bg-red-50 text-red-700'
                                : ev.kind === 'personal'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-blue-50 text-blue-700'
                          }`}
                        >
                          {ev.hora ? `${ev.hora.slice(0,5)} ` : ''}{ev.titulo}
                        </div>
                      ))}
                      {dayEvents.alerts.length + dayEvents.actuaciones.length + dayEvents.personales.length > 2 && (
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDate(day.date);
                          }}
                          className="text-[8px] text-orange-600 font-bold cursor-pointer hover:underline"
                        >
                          +{dayEvents.alerts.length + dayEvents.actuaciones.length + dayEvents.personales.length - 2} más
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {selectedDate && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black text-slate-900 uppercase">
              {selectedDate.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </h3>
            <button onClick={() => setSelectedDate(null)} className="text-slate-400 hover:text-slate-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {(() => {
            const dayEvents = getEventsForDate(selectedDate);
            const allDayEvents = [...dayEvents.alerts, ...dayEvents.actuaciones, ...dayEvents.personales];
            if (allDayEvents.length === 0) {
              return (
                <div className="text-center py-8 text-slate-400">
                  <p className="text-sm font-bold">No hay eventos para este día</p>
                  <button
                    onClick={openCreateForm}
                    className="mt-3 text-emerald-600 hover:text-emerald-700 text-xs font-bold"
                  >
                    + Añadir evento
                  </button>
                </div>
              );
            }
            return (
              <div className="space-y-4">
                {dayEvents.alerts.length > 0 && (
                  <div>
                    <h4 className="text-xs font-black text-slate-600 uppercase tracking-widest mb-2">
                      Tareas/Alertas ({dayEvents.alerts.length})
                    </h4>
                    <div className="space-y-2">
                      {dayEvents.alerts.map((alerta) => {
                        const cumplida = (alerta as { cumplida?: boolean }).cumplida;
                        const fv = alerta.fecha_vencimiento || alerta.fecha;
                        return (
                          <div
                            key={alerta.id}
                            onClick={() => openEventModal(alerta)}
                            className={`p-4 rounded-xl border cursor-pointer transition-all ${
                              cumplida ? 'bg-slate-50 border-slate-200' : 'bg-red-50 border-red-200 hover:bg-red-100'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className={`text-sm font-bold ${cumplida ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                                  {alerta.titulo}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">{alerta.caratula || 'Sin carátula'}</p>
                                {alerta.hora && (
                                  <p className="text-xs font-mono text-slate-400 mt-1">{String(alerta.hora).slice(0, 5)}</p>
                                )}
                              </div>
                              {!cumplida && (
                                <span className={`px-2 py-1 rounded text-[9px] font-black text-white ${getUrgencyColor(fv)}`}>
                                  {new Date(fv).getTime() < Date.now() ? 'Vencido' : 'Pendiente'}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {dayEvents.actuaciones.length > 0 && (
                  <div>
                    <h4 className="text-xs font-black text-slate-600 uppercase tracking-widest mb-2">
                      Actuaciones ({dayEvents.actuaciones.length})
                    </h4>
                    <div className="space-y-2">
                      {dayEvents.actuaciones.map((actuacion) => (
                        <div
                          key={actuacion.id}
                          onClick={() => openEventModal(actuacion)}
                          className="p-4 rounded-xl border border-blue-200 bg-blue-50 cursor-pointer hover:bg-blue-100 transition-all"
                        >
                          <p className="text-xs font-black text-blue-600 uppercase">{(actuacion as { tipo?: string }).tipo || 'Sin tipo'}</p>
                          <p className="text-sm font-bold text-slate-900 mt-1">{(actuacion as { descripcion?: string }).descripcion || 'Sin descripción'}</p>
                          <p className="text-xs text-slate-500 mt-1">{actuacion.caratula || 'Sin carátula'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {dayEvents.personales.length > 0 && (
                  <div>
                    <h4 className="text-xs font-black text-slate-600 uppercase tracking-widest mb-2">
                      Eventos personales ({dayEvents.personales.length})
                    </h4>
                    <div className="space-y-2">
                      {dayEvents.personales.map((ev) => (
                        <div
                          key={ev.id}
                          onClick={() => openEventModal(ev)}
                          className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 cursor-pointer hover:bg-emerald-100 transition-all"
                        >
                          <p className="text-xs font-black text-emerald-600 uppercase">{ev.tipo || 'Evento'}</p>
                          <p className="text-sm font-bold text-slate-900 mt-1">{ev.titulo}</p>
                          {(ev.caratula || ev.descripcion) && (
                            <p className="text-xs text-slate-500 mt-1">{ev.caratula || ev.descripcion}</p>
                          )}
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

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <h4 className="text-xs font-black text-slate-600 uppercase tracking-widest mb-3">Leyenda</h4>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500" /><span className="font-bold">Vencido</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-400" /><span className="font-bold">Vence hoy</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-400" /><span className="font-bold">Urgente (3 días)</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-400" /><span className="font-bold">Pendiente</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500" /><span className="font-bold">Actuación</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500" /><span className="font-bold">Evento personal</span></div>
        </div>
      </div>

      <CalendarEventFormModal
        open={formModalOpen}
        onClose={() => { setFormModalOpen(false); setEditingEvent(null); }}
        initialDate={selectedDate ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}` : undefined}
        editEvent={editingEvent}
        onSaved={refreshEvents}
        casesProp={casesProp}
      />

      <EventDetailModal
        event={selectedEvent}
        open={eventModalOpen}
        onClose={() => { setEventModalOpen(false); setSelectedEvent(null); }}
        onSelectCase={(c) => { setEventModalOpen(false); onSelectCase(c); }}
        onToggleAlerta={handleToggleAlerta}
        onEditPersonalEvent={openEditForm}
        onDeletePersonalEvent={handleDeletePersonal}
      />
    </div>
  );
};

export default Calendar;
