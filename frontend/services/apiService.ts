import { LawCase, User, CaseActuacion, CaseAlerta, CaseNote, Cliente, CaseTag, ActuacionTemplate, DashboardStats } from '../types';

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
    // Si el refresh falla, hacer logout
    removeTokens();
    window.location.href = '/';
    throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
  }

  if (!response.ok) {
    // Intentar obtener el mensaje de error del JSON
    let errorMessage = response.statusText;
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorData.message || errorData.error || response.statusText;
    } catch {
      // Si no se puede parsear JSON, usar el statusText
    }

    // Para errores 403, mensaje más específico
    if (response.status === 403) {
      throw new Error('No tienes permisos de administrador para acceder a esta sección');
    }

    throw new Error(errorMessage || `Error ${response.status}: ${response.statusText}`);
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

  const result = await apiRequest<any>(`/cases/?${params.toString()}`);
  // Soportar respuesta paginada { results, count } o array directo (fallback)
  const results = Array.isArray(result?.results)
    ? result.results
    : Array.isArray(result)
      ? result
      : Array.isArray(result?.data)
        ? result.data
        : [];
  const count = typeof result?.count === 'number' ? result.count : results.length;
  return {
    results,
    count,
    next: result?.next ?? null,
    previous: result?.previous ?? null,
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

export const apiDeleteUser = async (id: string): Promise<void> => {
  await apiRequest(`/users/${id}/`, {
    method: 'DELETE',
  });
};

// ============ DASHBOARD ============
export const apiGetDashboard = async (): Promise<DashboardStats> => {
  return apiRequest<DashboardStats>('/dashboard/');
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
  const query = params.toString() ? `?${params.toString()}` : '';
  const result = await apiRequest<Cliente[]>(`/clientes/${query}`);
  return Array.isArray(result) ? result : [];
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
export const apiCreateAviso = async (contenido: string): Promise<any> => {
  return apiRequest('/avisos/', {
    method: 'POST',
    body: JSON.stringify({ contenido, active: true }),
  });
};

// ============ ALERTAS ============
export const apiGetAlertasPaginated = async (page: number): Promise<{ results: CaseAlerta[]; next: string | null }> => {
  const result = await apiRequest<any>(`/alertas/?page_size=5&page=${page}`);
  return {
    results: result.results || [],
    next: result.next,
  };
};
