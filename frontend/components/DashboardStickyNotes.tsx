import React, { useState, useEffect, useCallback } from 'react';
import { UserStickyNote, CalendarEvent } from '../types';
import * as api from '../services/apiService';

interface DashboardStickyNotesProps {
  /** Datos iniciales desde Dashboard (evita petición separada) */
  initialNotes?: UserStickyNote[];
  todayEvents?: CalendarEvent[];
}

const getErrorMessage = (err: unknown): string => {
  if (err && typeof err === 'object' && 'message' in err && typeof (err as Error).message === 'string') {
    return (err as Error).message;
  }
  return 'Ha ocurrido un error. Intenta de nuevo.';
};

const DashboardStickyNotes: React.FC<DashboardStickyNotesProps> = ({ initialNotes, todayEvents = [] }) => {
  const [notes, setNotes] = useState<UserStickyNote[]>(initialNotes ?? []);
  const [loading, setLoading] = useState(initialNotes === undefined);
  const [adding, setAdding] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [formTitulo, setFormTitulo] = useState('');
  const [formContenido, setFormContenido] = useState('');
  const [formFecha, setFormFecha] = useState('');

  const clearError = useCallback(() => setErrorMsg(null), []);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.apiGetStickyNotes();
      setNotes(data);
    } catch {
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialNotes !== undefined) {
      setNotes(initialNotes);
      setLoading(false);
    } else {
      loadNotes();
    }
  }, [initialNotes, loadNotes]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const titulo = formTitulo.trim();
    if (!titulo) return;
    setErrorMsg(null);
    setCreating(true);
    try {
      const created = await api.apiCreateStickyNote({
        titulo,
        contenido: formContenido.trim() || '',
        fecha_recordatorio: formFecha || null,
        completada: false,
        orden: 0,
      });
      setNotes((prev) => [...prev, created]);
      setFormTitulo('');
      setFormContenido('');
      setFormFecha('');
      setAdding(false);
    } catch (err) {
      console.error(err);
      setErrorMsg(getErrorMessage(err));
      loadNotes();
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (id: string) => {
    setErrorMsg(null);
    const previous = notes.find((n) => String(n.id) === String(id));
    setNotes((prev) => prev.map((n) => (String(n.id) === String(id) ? { ...n, completada: !n.completada } : n)));
    try {
      const updated = await api.apiToggleStickyNote(id);
      setNotes((prev) => prev.map((n) => (String(n.id) === String(id) ? updated : n)));
    } catch (err) {
      console.error(err);
      if (previous) setNotes((prev) => prev.map((n) => (String(n.id) === String(id) ? previous : n)));
      setErrorMsg(getErrorMessage(err));
      loadNotes();
    }
  };

  const handleUpdate = async (id: string, titulo: string, contenido: string, fecha: string) => {
    setErrorMsg(null);
    try {
      const updated = await api.apiUpdateStickyNote(id, {
        titulo,
        contenido: contenido || '',
        fecha_recordatorio: fecha || null,
      });
      setNotes((prev) => prev.map((n) => (String(n.id) === String(id) ? updated : n)));
      setEditId(null);
    } catch (err) {
      console.error(err);
      setErrorMsg(getErrorMessage(err));
      loadNotes();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta notita?')) return;
    setErrorMsg(null);
    const removed = notes.find((n) => String(n.id) === String(id));
    setNotes((prev) => prev.filter((n) => String(n.id) !== String(id)));
    try {
      await api.apiDeleteStickyNote(id);
    } catch (err) {
      console.error(err);
      if (removed) setNotes((prev) => [...prev, removed]);
      setErrorMsg(getErrorMessage(err));
      loadNotes();
    }
  };

  const sortedNotes = React.useMemo(() => [...notes].sort((a, b) => {
    if (a.fecha_recordatorio && b.fecha_recordatorio) {
      return a.fecha_recordatorio.localeCompare(b.fecha_recordatorio);
    }
    if (a.fecha_recordatorio) return -1;
    if (b.fecha_recordatorio) return 1;
    return (b.created_at || '').localeCompare(a.created_at || '');
  }), [notes]);

  const notesWithoutDate = sortedNotes.filter((n) => !n.fecha_recordatorio);
  const notesWithDate = sortedNotes.filter((n) => n.fecha_recordatorio);

  const getEventIcon = (kind: string) => {
    switch (kind) {
      case 'alerta': return '⚠️';
      case 'actuacion': return '📋';
      case 'personal': return '📅';
      default: return '📝';
    }
  };

  const getEventColor = (kind: string) => {
    switch (kind) {
      case 'alerta': return 'bg-red-50 border-red-100 text-red-800';
      case 'actuacion': return 'bg-blue-50 border-blue-100 text-blue-800';
      case 'personal': return 'bg-emerald-50 border-emerald-100 text-emerald-800';
      default: return 'bg-amber-50 border-amber-100 text-amber-800';
    }
  };

  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col h-[160px]">
      <div className="flex items-center justify-between mb-2 shrink-0">
        <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">
          Mis Notitas / Recordatorios
        </h3>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="text-[8px] font-black text-orange-600 hover:text-orange-700 uppercase"
          >
            + Nueva
          </button>
        )}
      </div>

      {adding && (
        <form onSubmit={handleCreate} className="mb-2 p-3 bg-slate-50 rounded-lg border border-slate-100 shrink-0">
          <input
            type="text"
            value={formTitulo}
            onChange={(e) => setFormTitulo(e.target.value)}
            placeholder="Título"
            className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded mb-1.5 focus:outline-none focus:ring-2 focus:ring-orange-400"
            autoFocus
          />
          <textarea
            value={formContenido}
            onChange={(e) => setFormContenido(e.target.value)}
            placeholder="Contenido (opcional)"
            rows={2}
            className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded mb-1.5 focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
          />
          <input
            type="date"
            value={formFecha}
            onChange={(e) => setFormFecha(e.target.value)}
            className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded mb-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <div className="flex gap-1.5">
            <button
              type="submit"
              disabled={creating}
              className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[10px] font-bold rounded"
            >
              {creating ? 'Guardando…' : 'Guardar'}
            </button>
            <button
              type="button"
              disabled={creating}
              onClick={() => { setAdding(false); setFormTitulo(''); setFormContenido(''); setFormFecha(''); clearError(); }}
              className="px-3 py-1.5 border border-slate-200 text-slate-600 text-[10px] font-bold rounded hover:bg-slate-50 disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {errorMsg && (
        <div className="mb-2 p-2 bg-red-50 border border-red-100 rounded-lg flex items-center justify-between gap-2 shrink-0">
          <p className="text-[10px] font-bold text-red-700 flex-1 min-w-0">{errorMsg}</p>
          <button type="button" onClick={clearError} className="p-0.5 text-red-500 hover:text-red-700 shrink-0" aria-label="Cerrar">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      <div className="space-y-2 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="py-6 text-center text-slate-400">
            <span className="animate-spin inline-block rounded-full h-5 w-5 border-2 border-orange-500 border-t-transparent" />
          </div>
        ) : (
          <>
            {todayEvents.length > 0 && (
              <div className="shrink-0">
                <h4 className="text-[8px] font-black text-slate-900 uppercase tracking-widest mb-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  HOY
                </h4>
                <div className="space-y-1">
                  {todayEvents.map((event) => (
                    <div key={`${event.kind}-${event.id}`} className={`p-2 rounded border text-[10px] ${getEventColor(event.kind)}`}>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px]">{getEventIcon(event.kind)}</span>
                        <span className="font-bold">{event.hora ? `${event.hora.slice(0,5)}` : '--:--'}</span>
                        <span className="font-bold flex-1 truncate">{event.titulo}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {notesWithDate.length > 0 && (
              <div className="shrink-0">
                <h4 className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">
                  📅 CON FECHA
                </h4>
                <div className="space-y-1">
                  {notesWithDate.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      editId={editId}
                      onToggle={handleToggle}
                      onEdit={setEditId}
                      onUpdate={handleUpdate}
                      onDelete={handleDelete}
                      onCancelEdit={() => setEditId(null)}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="min-h-0">
              <h4 className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">
                📌 SIN FECHA
              </h4>
              {notesWithoutDate.length === 0 && notesWithDate.length === 0 ? (
                <div className="py-3 text-center text-slate-400">
                  <p className="text-[10px] font-bold">Sin notitas aún</p>
                  <p className="text-[9px] mt-0.5">Usa &quot;+ Nueva&quot; para añadir una</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {notesWithoutDate.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      editId={editId}
                      onToggle={handleToggle}
                      onEdit={setEditId}
                      onUpdate={handleUpdate}
                      onDelete={handleDelete}
                      onCancelEdit={() => setEditId(null)}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const NoteCard: React.FC<{
  note: UserStickyNote;
  editId: string | null;
  onToggle: (id: string) => void;
  onEdit: (id: string) => void;
  onUpdate: (id: string, titulo: string, contenido: string, fecha: string) => void;
  onDelete: (id: string) => void;
  onCancelEdit: () => void;
}> = ({ note, editId, onToggle, onEdit, onUpdate, onDelete, onCancelEdit }) => (
  <div
    className={`p-2 rounded-lg border transition-all ${
      note.completada ? 'bg-slate-50 border-slate-100' : 'bg-amber-50/50 border-amber-100'
    }`}
  >
    {editId === note.id ? (
      <StickyNoteEditForm
        note={note}
        onSave={(t, c, f) => onUpdate(note.id, t, c, f)}
        onCancel={onCancelEdit}
      />
    ) : (
      <div className="flex items-start gap-1.5">
        <button
          onClick={() => onToggle(note.id)}
          className={`mt-0.5 w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${
            note.completada ? 'bg-green-500 border-green-500' : 'border-slate-300 hover:border-orange-400'
          }`}
        >
          {note.completada && (
            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-bold leading-tight ${note.completada ? 'line-through text-slate-400' : 'text-slate-800'}`}>
            {note.titulo}
          </p>
          {note.contenido && (
            <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{note.contenido}</p>
          )}
          {note.fecha_recordatorio && (
            <p className="text-[9px] font-mono text-slate-400 mt-0.5">{note.fecha_recordatorio}</p>
          )}
        </div>
        <div className="flex gap-0.5">
          <button onClick={() => onEdit(note.id)} className="p-1 text-slate-400 hover:text-slate-600" title="Editar">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button onClick={() => onDelete(note.id)} className="p-1 text-slate-400 hover:text-red-500" title="Eliminar">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    )}
  </div>
);

const StickyNoteEditForm: React.FC<{
  note: UserStickyNote;
  onSave: (titulo: string, contenido: string, fecha: string) => void;
  onCancel: () => void;
}> = ({ note, onSave, onCancel }) => {
  const [titulo, setTitulo] = useState(note.titulo);
  const [contenido, setContenido] = useState(note.contenido || '');
  const [fecha, setFecha] = useState(note.fecha_recordatorio || '');

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(titulo.trim(), contenido, fecha);
      }}
      className="space-y-1.5"
    >
      <input
        type="text"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        className="w-full px-2 py-1 text-xs border border-slate-200 rounded"
        autoFocus
      />
      <textarea
        value={contenido}
        onChange={(e) => setContenido(e.target.value)}
        rows={2}
        className="w-full px-2 py-1 text-xs border border-slate-200 rounded resize-none"
      />
      <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full px-2 py-1 text-xs border border-slate-200 rounded" />
      <div className="flex gap-1.5 mt-1.5">
        <button type="submit" className="px-2.5 py-1 bg-orange-500 text-white text-[10px] font-bold rounded">
          Guardar
        </button>
        <button type="button" onClick={onCancel} className="px-2.5 py-1 border border-slate-200 text-[10px] font-bold rounded">
          Cancelar
        </button>
      </div>
    </form>
  );
};

export default DashboardStickyNotes;
