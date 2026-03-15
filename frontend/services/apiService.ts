import { LawCase, User, CaseActuacion, CaseAlerta, CaseNote, Cliente, CaseTag, ActuacionTemplate, DashboardStats, CalendarEvent, UserStickyNote, UserCalendarEvent, Aviso, CaseActivityLog } from '../types';

// Normalizar para evitar dobles slashes (ej: /api//auth/login/)
const RAW_API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const API_BASE_URL = String(RAW_API_BASE_URL).replace(/\/+$/, '');

// Utilidades para manejar tokens JWT
const getToken = (): string | null => {
  return localStorage.getItem('access_token');
};

const setTokens = (access: string, refresh: string): void => {
  localStorage.setItem('access_token', access);
  localStorage.setItem('refresh_token', refresh);
};

const removeTokens = (): void => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('current_user');
};

// Función para hacer peticiones con autenticación
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = getToken();
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Token expirado, intentar refresh
    const refreshed = await refreshToken();
    if (refreshed) {
      // Reintentar la petición con el nuevo token
      const newToken = getToken();
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
        const retryResponse = await fetch(url, {
          ...options,
          headers,
        });
        if (!retryResponse.ok) {
          throw new Error(`Error ${retryResponse.status}: ${retryResponse.statusText}`);
        }
        return retryResponse.json();
      }
    }
    // Si el refresh falla, hacer logout y recargar para mostrar Login
    removeTokens();
    window.location.replace(window.location.origin + '/');
    throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
  }

  if (!response.ok) {
    // Intentar obtener el mensaje de error del JSON
    let errorMessage = response.statusText;
    let errorData: any = null;
    try {
      errorData = await response.json();
      errorMessage = errorData.detail || errorData.message || errorData.error || response.statusText;
    } catch {
      // Si no se puede parsear JSON, usar el statusText
    }

    // Para errores 403, mensaje más específico
    if (response.status === 403) {
      const err: any = new Error('No tienes permisos de administrador para acceder a esta sección');
      err.response = { status: 403, data: errorData };
      throw err;
    }

    // Crear error con datos de respuesta para mejor manejo en el frontend
    const err: any = new Error(errorMessage || `Error ${response.status}: ${response.statusText}`);
    err.response = { status: response.status, data: errorData };
    throw err;
  }

  // Si la respuesta está vacía (204 No Content), retornar null
  if (response.status === 204) {
    return null as T;
  }

  // Intentar parsear JSON, si falla retornar texto vacío
  try {
    const text = await response.text();
    if (!text) {
      return null as T;
    }
    return JSON.parse(text);
  } catch (error) {
    // Si no es JSON válido, retornar el texto como string
    return response.text() as unknown as T;
  }
};

// Refresh token
const refreshToken = async (): Promise<boolean> => {
  const refresh = localStorage.getItem('refresh_token');
  if (!refresh) return false;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });

    if (response.ok) {
      const data = await response.json();
      setTokens(data.access, refresh);
      return true;
    }
    return false;
  } catch {
    return false;
  }
};

// ============ AUTENTICACIÓN ============
export const apiLogin = async (username: string, password: string): Promise<User> => {
  const response = await fetch(`${API_BASE_URL}/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Credenciales incorrectas' }));
    throw new Error(error.detail || 'Credenciales incorrectas');
  }

  const data = await response.json();
  setTokens(data.access, data.refresh);
  // Normalizar el usuario: convertir is_admin a isAdmin y asegurar que id sea string
  const normalizedUser: User = {
    ...data.user,
    id: String(data.user.id),
    isAdmin: data.user.is_admin ?? data.user.isAdmin ?? false,
  };
  localStorage.setItem('current_user', JSON.stringify(normalizedUser));
  return normalizedUser;
};

export const apiLogout = (): void => {
  removeTokens();
};

export const apiGetCurrentUser = async (): Promise<User | null> => {
  const stored = localStorage.getItem('current_user');
  if (stored) {
    try {
      // Verificar que el token sigue siendo válido
      const userData = await apiRequest<any>('/auth/me/');
      // Normalizar el usuario
      const normalizedUser: User = {
        ...userData,
        id: String(userData.id),
        isAdmin: userData.is_admin ?? userData.isAdmin ?? false,
      };
      localStorage.setItem('current_user', JSON.stringify(normalizedUser));
      return normalizedUser;
    } catch {
      // Token inválido, limpiar
      removeTokens();
      return null;
    }
  }
  return null;
};

export const apiGetStoredUser = (): User | null => {
  const stored = localStorage.getItem('current_user');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
  return null;
};

// ============ EXPEDIENTES (CASES) ============
export interface CasesListFilters {
  search?: string;
  estado?: string;
  abogado?: string;
  fuero?: string;
  juzgado?: string;
  cliente?: string | number;
  etiqueta?: string | number;
  fecha_inicio_desde?: string;
  fecha_inicio_hasta?: string;
  fecha_modificacion_desde?: string;
  fecha_modificacion_hasta?: string;
}

export interface CasesPaginatedResponse {
  results: LawCase[];
  count: number;
  next: string | null;
  previous: string | null;
  clientes?: Cliente[];
}

export const apiGetCases = async (
  filters?: CasesListFilters,
  page: number = 1
): Promise<CasesPaginatedResponse> => {
  const params = new URLSearchParams();
  if (filters?.search) params.append('search', filters.search);
  if (filters?.estado) params.append('estado', filters.estado);
  if (filters?.abogado) params.append('abogado', filters.abogado);
  if (filters?.fuero) params.append('fuero', filters.fuero);
  if (filters?.juzgado) params.append('juzgado', filters.juzgado);
  if (filters?.cliente) params.append('cliente', String(filters.cliente));
  if (filters?.etiqueta) params.append('etiqueta', String(filters.etiqueta));
  if (filters?.fecha_inicio_desde) params.append('fecha_inicio_desde', filters.fecha_inicio_desde);
  if (filters?.fecha_inicio_hasta) params.append('fecha_inicio_hasta', filters.fecha_inicio_hasta);
  if (filters?.fecha_modificacion_desde) params.append('fecha_modificacion_desde', filters.fecha_modificacion_desde);
  if (filters?.fecha_modificacion_hasta) params.append('fecha_modificacion_hasta', filters.fecha_modificacion_hasta);
  params.append('page', String(page));
  params.append('page_size', '10');
  params.append('include_clientes', '1');

  const result = await apiRequest<any>(`/cases/?${params.toString()}`);
  const results = Array.isArray(result?.results)
    ? result.results
    : Array.isArray(result)
      ? result
      : Array.isArray(result?.data)
        ? result.data
        : [];
  const count = typeof result?.count === 'number' ? result.count : results.length;
  const clientes = Array.isArray(result?.clientes) ? result.clientes : undefined;
  return {
    results,
    count,
    next: result?.next ?? null,
    previous: result?.previous ?? null,
    clientes,
  };
};

export const apiGetCase = async (id: string): Promise<LawCase> => {
  return apiRequest<LawCase>(`/cases/${id}/`);
};

export const apiCreateCase = async (
  caseData: Omit<LawCase, 'id' | 'codigo_interno' | 'updatedAt' | 'actuaciones' | 'alertas' | 'notas' | 'createdBy' | 'lastModifiedBy' | 'created_at' | 'updated_at'>
): Promise<LawCase> => {
  return apiRequest<LawCase>('/cases/', {
    method: 'POST',
    body: JSON.stringify(caseData),
  });
};

export const apiUpdateCase = async (id: string, caseData: Partial<LawCase>): Promise<LawCase> => {
  return apiRequest<LawCase>(`/cases/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(caseData),
  });
};

export const apiDeleteCase = async (id: string): Promise<void> => {
  await apiRequest(`/cases/${id}/`, {
    method: 'DELETE',
  });
};

// ============ ACTUACIONES ============
export const apiCreateActuacion = async (
  casoId: string,
  actuacion: Omit<CaseActuacion, 'id' | 'caso' | 'caso_id' | 'created_at' | 'created_by' | 'created_by_username'>
): Promise<CaseActuacion> => {
  return apiRequest<CaseActuacion>(`/cases/${casoId}/add_actuacion/`, {
    method: 'POST',
    body: JSON.stringify(actuacion),
  });
};

export const apiUpdateActuacion = async (id: string, actuacion: Partial<CaseActuacion>): Promise<CaseActuacion> => {
  return apiRequest<CaseActuacion>(`/actuaciones/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(actuacion),
  });
};

export const apiDeleteActuacion = async (id: string): Promise<void> => {
  await apiRequest(`/actuaciones/${id}/`, {
    method: 'DELETE',
  });
};

// ============ ALERTAS ============
export const apiCreateAlerta = async (
  casoId: string,
  alerta: Omit<CaseAlerta, 'id' | 'caso' | 'caso_id' | 'created_at' | 'created_by' | 'created_by_username' | 'completed_at' | 'completed_by' | 'completed_by_username'>
): Promise<CaseAlerta> => {
  return apiRequest<CaseAlerta>(`/cases/${casoId}/add_alerta/`, {
    method: 'POST',
    body: JSON.stringify(alerta),
  });
};

export const apiUpdateAlerta = async (id: string, alerta: Partial<CaseAlerta>): Promise<CaseAlerta> => {
  return apiRequest<CaseAlerta>(`/alertas/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(alerta),
  });
};

export const apiToggleAlerta = async (id: string): Promise<CaseAlerta> => {
  return apiRequest<CaseAlerta>(`/alertas/${id}/toggle_cumplida/`, {
    method: 'POST',
  });
};

export const apiDeleteAlerta = async (id: string): Promise<void> => {
  await apiRequest(`/alertas/${id}/`, {
    method: 'DELETE',
  });
};

// ============ NOTAS ============
export const apiCreateNote = async (
  casoId: string,
  note: Omit<CaseNote, 'id' | 'caso' | 'caso_id' | 'created_at' | 'created_by' | 'created_by_username'>
): Promise<CaseNote> => {
  return apiRequest<CaseNote>(`/cases/${casoId}/add_note/`, {
    method: 'POST',
    body: JSON.stringify(note),
  });
};

export const apiUpdateNote = async (id: string, note: Partial<CaseNote>): Promise<CaseNote> => {
  return apiRequest<CaseNote>(`/notas/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(note),
  });
};

export const apiDeleteNote = async (id: string): Promise<void> => {
  await apiRequest(`/notas/${id}/`, {
    method: 'DELETE',
  });
};

// ============ USUARIOS ============
/** Usuarios asignables a expedientes (abogados y admins). Cualquier autenticado puede llamar. */
export const apiGetAssignableUsers = async (): Promise<{ id: number; username: string }[]> => {
  const data = await apiRequest<{ id: number; username: string }[]>('/assignables/');
  return Array.isArray(data) ? data : [];
};

export const apiGetUsers = async (): Promise<User[]> => {
  const data = await apiRequest<any>('/users/');
  // El backend usa paginación: devuelve { count, next, previous, results: [...] }
  const rawList = Array.isArray(data) ? data : (data?.results ?? []);
  if (!Array.isArray(rawList)) return [];
  return rawList.map((user: any) => ({
    ...user,
    id: String(user.id),
    isAdmin: user.is_admin ?? user.isAdmin ?? false,
    rol: user.rol ?? (user.is_admin ? 'admin' : 'usuario'),
  }));
};

export const apiCreateUser = async (user: Omit<User, 'id'> & { password: string; rol?: string }): Promise<User> => {
  // Usar rol si está disponible, sino usar isAdmin como fallback
  const rol = user.rol || (user.isAdmin || user.is_admin ? 'admin' : 'usuario');

  const created = await apiRequest<any>('/users/', {
    method: 'POST',
    body: JSON.stringify({
      username: user.username,
      password: user.password,
      rol: rol,
    }),
  });
  return {
    ...created,
    id: String(created.id),
    isAdmin: created.is_admin ?? created.isAdmin ?? false,
    rol: created.rol || (created.is_admin ? 'admin' : 'usuario'),
  };
};

export const apiUpdateUser = async (id: string, user: Partial<User> & { password?: string; rol?: string }): Promise<User> => {
  const payload: any = {};
  
  if (user.rol !== undefined) {
    payload.rol = user.rol;
  }
  if (user.password !== undefined && user.password.trim() !== '') {
    payload.password = user.password;
  }
  if (user.username !== undefined) {
    payload.username = user.username;
  }

  const updated = await apiRequest<any>(`/users/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  
  return {
    ...updated,
    id: String(updated.id),
    isAdmin: updated.is_admin ?? updated.isAdmin ?? false,
    rol: updated.rol || (updated.is_admin ? 'admin' : 'usuario'),
  };
};

export const apiDeleteUser = async (id: string): Promise<void> => {
  await apiRequest(`/users/${id}/`, {
    method: 'DELETE',
  });
};

// ============ CALENDARIO ============
export const apiGetCalendarEvents = async (
  desde: string,
  hasta: string
): Promise<CalendarEvent[]> => {
  const params = new URLSearchParams({ desde, hasta });
  const result = await apiRequest<{ eventos: CalendarEvent[] }>(`/calendar/events/?${params}`);
  return Array.isArray(result?.eventos) ? result.eventos : [];
};

export const apiCreateCalendarEvent = async (
  data: Omit<UserCalendarEvent, 'id' | 'created_at' | 'updated_at'>
): Promise<UserCalendarEvent> => {
  return apiRequest<UserCalendarEvent>('/calendar-events/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const apiUpdateCalendarEvent = async (
  id: string,
  data: Partial<UserCalendarEvent>
): Promise<UserCalendarEvent> => {
  return apiRequest<UserCalendarEvent>(`/calendar-events/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

export const apiDeleteCalendarEvent = async (id: string): Promise<void> => {
  await apiRequest(`/calendar-events/${id}/`, { method: 'DELETE' });
};

// ============ STICKY NOTES ============
export const apiGetStickyNotes = async (): Promise<UserStickyNote[]> => {
  const result = await apiRequest<UserStickyNote[] | { results: UserStickyNote[] }>('/sticky-notes/');
  const arr = Array.isArray(result) ? result : result?.results;
  return Array.isArray(arr) ? arr : [];
};

export const apiCreateStickyNote = async (
  data: Omit<UserStickyNote, 'id' | 'created_at' | 'updated_at'>
): Promise<UserStickyNote> => {
  return apiRequest<UserStickyNote>('/sticky-notes/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const apiUpdateStickyNote = async (
  id: string,
  data: Partial<UserStickyNote>
): Promise<UserStickyNote> => {
  return apiRequest<UserStickyNote>(`/sticky-notes/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

export const apiDeleteStickyNote = async (id: string): Promise<void> => {
  await apiRequest(`/sticky-notes/${id}/`, { method: 'DELETE' });
};

export const apiToggleStickyNote = async (id: string): Promise<UserStickyNote> => {
  return apiRequest<UserStickyNote>(`/sticky-notes/${id}/toggle_completada/`, { method: 'POST' });
};

// ============ DASHBOARD ============
/** Timeout 90s para tolerar cold start de Render free tier (~30-60s) */
const DASHBOARD_TIMEOUT_MS = 90000;

export const apiGetDashboard = async (): Promise<DashboardStats> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DASHBOARD_TIMEOUT_MS);
  try {
    return await apiRequest<DashboardStats>('/dashboard/', { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
};

// ============ EXPORTACIÓN ============
export const apiExportExcel = async (filters?: {
  search?: string;
  estado?: string;
  abogado?: string;
  fuero?: string;
  juzgado?: string;
  cliente?: string | number;
  etiqueta?: string | number;
}): Promise<Blob> => {
  const params = new URLSearchParams();
  if (filters?.search) params.append('search', filters.search);
  if (filters?.estado) params.append('estado', filters.estado);
  if (filters?.abogado) params.append('abogado', filters.abogado);
  if (filters?.fuero) params.append('fuero', filters.fuero);
  if (filters?.juzgado) params.append('juzgado', filters.juzgado);
  if (filters?.cliente) params.append('cliente', String(filters.cliente));
  if (filters?.etiqueta) params.append('etiqueta', String(filters.etiqueta));

  const query = params.toString() ? `?${params.toString()}` : '';
  const token = getToken();
  const url = `${API_BASE_URL}/cases/export_excel/${query}`;

  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error('Error al exportar a Excel');
  }
  return response.blob();
};

export const apiExportCaseTimeline = async (caseId: string): Promise<Blob> => {
  const token = getToken();
  const url = `${API_BASE_URL}/cases/${caseId}/export_timeline/`;

  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error('Error al exportar el timeline del caso');
  }
  return response.blob();
};

// ============ CLIENTES ============
export const apiGetClientes = async (search?: string): Promise<Cliente[]> => {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  params.append('page_size', '500');
  const query = params.toString() ? `?${params.toString()}` : '';
  const result = await apiRequest<any>(`/clientes/${query}`);
  const arr = result?.results ?? result;
  return Array.isArray(arr) ? arr : [];
};

export const apiGetCliente = async (id: string): Promise<Cliente> => {
  return apiRequest<Cliente>(`/clientes/${id}/`);
};

export const apiCreateCliente = async (cliente: Omit<Cliente, 'id' | 'total_expedientes' | 'created_at' | 'updated_at'>): Promise<Cliente> => {
  return apiRequest<Cliente>('/clientes/', {
    method: 'POST',
    body: JSON.stringify(cliente),
  });
};

export const apiUpdateCliente = async (id: string, cliente: Partial<Cliente>): Promise<Cliente> => {
  return apiRequest<Cliente>(`/clientes/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(cliente),
  });
};

export const apiDeleteCliente = async (id: string): Promise<void> => {
  await apiRequest(`/clientes/${id}/`, {
    method: 'DELETE',
  });
};

// ============ ETIQUETAS ============
export const apiGetTags = async (search?: string): Promise<CaseTag[]> => {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  const query = params.toString() ? `?${params.toString()}` : '';
  const result = await apiRequest<CaseTag[]>(`/tags/${query}`);
  return Array.isArray(result) ? result : [];
};

export const apiCreateTag = async (tag: Omit<CaseTag, 'id' | 'created_at'>): Promise<CaseTag> => {
  return apiRequest<CaseTag>('/tags/', {
    method: 'POST',
    body: JSON.stringify(tag),
  });
};

export const apiUpdateTag = async (id: string, tag: Partial<CaseTag>): Promise<CaseTag> => {
  return apiRequest<CaseTag>(`/tags/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(tag),
  });
};

export const apiDeleteTag = async (id: string): Promise<void> => {
  await apiRequest(`/tags/${id}/`, {
    method: 'DELETE',
  });
};

// ============ PLANTILLAS DE ACTUACIONES ============
export const apiGetActuacionTemplates = async (tipo?: string): Promise<ActuacionTemplate[]> => {
  const params = new URLSearchParams();
  if (tipo) params.append('tipo', tipo);
  const query = params.toString() ? `?${params.toString()}` : '';
  const result = await apiRequest<ActuacionTemplate[]>(`/actuacion-templates/${query}`);
  return Array.isArray(result) ? result : [];
};

export const apiGetActuacionTemplate = async (id: string): Promise<ActuacionTemplate> => {
  return apiRequest<ActuacionTemplate>(`/actuacion-templates/${id}/`);
};

export const apiCreateActuacionTemplate = async (template: Omit<ActuacionTemplate, 'id' | 'created_by' | 'created_by_username' | 'created_at' | 'updated_at'>): Promise<ActuacionTemplate> => {
  return apiRequest<ActuacionTemplate>('/actuacion-templates/', {
    method: 'POST',
    body: JSON.stringify(template),
  });
};

export const apiUpdateActuacionTemplate = async (id: string, template: Partial<ActuacionTemplate>): Promise<ActuacionTemplate> => {
  return apiRequest<ActuacionTemplate>(`/actuacion-templates/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(template),
  });
};

export const apiDeleteActuacionTemplate = async (id: string): Promise<void> => {
  await apiRequest(`/actuacion-templates/${id}/`, {
    method: 'DELETE',
  });
};
// ============ AVISOS ============
export const apiCreateAviso = async (contenido: string): Promise<Aviso> => {
  return apiRequest<Aviso>('/avisos/', {
    method: 'POST',
    body: JSON.stringify({ contenido, active: true }),
  });
};

// ============ ALERTAS ============
/** Alertas paginadas del dashboard (filtradas por expedientes del usuario). Usar para "Ver más" en Dashboard. */
export const apiGetDashboardAlertasPaginated = async (page: number): Promise<{ results: CaseAlerta[]; next: string | null }> => {
  const result = await apiRequest<any>(`/dashboard/alertas/?page=${page}`);
  return {
    results: result.results || [],
    next: result.next,
  };
};

/** Alertas genéricas (todas). Solo para contextos donde no aplica filtro por usuario. */
export const apiGetAlertasPaginated = async (page: number): Promise<{ results: CaseAlerta[]; next: string | null }> => {
  const result = await apiRequest<any>(`/alertas/?page_size=5&page=${page}`);
  return {
    results: result.results || [],
    next: result.next,
  };
};

/** Actividades del dashboard paginadas (lazy loading). Página 1 = primeras 10 (ya vienen en dashboard); usar page≥2 para "cargar más". */
export const apiGetDashboardActivities = async (page: number): Promise<{ results: CaseActivityLog[]; next: string | null }> => {
  const result = await apiRequest<{ results: CaseActivityLog[]; next: string | null }>(`/dashboard/activities/?page=${page}`);
  return { results: result.results || [], next: result.next ?? null };
};

/** Actividades de un caso específico (trazabilidad) */
export const apiGetCaseActivities = async (caseId: string): Promise<CaseActivityLog[]> => {
  return await apiRequest<CaseActivityLog[]>(`/cases/${caseId}/activities/`);
};
