
import { LawCase, CaseStatus, CasePriority, User } from '../types';

const STORAGE_KEY = 'neira_trujillo_v5_data';
const USERS_KEY = 'neira_trujillo_users';
const SESSION_KEY = 'neira_trujillo_session';

const generateInternalCode = (existingCases: LawCase[]): string => {
  const year = new Date().getFullYear();
  const count = existingCases.length + 1;
  const sequential = count.toString().padStart(4, '0');
  return `ENT-${sequential}-${year}-JLCA`;
};

// --- GESTIÓN DE USUARIOS ---
export const getUsers = (): User[] => {
  const data = localStorage.getItem(USERS_KEY);
  if (!data) {
    // Se cambia el acceso predeterminado según solicitud del usuario
    const defaultAdmin: User = { id: 'admin', username: 'admin', password: 'admin', isAdmin: true };
    localStorage.setItem(USERS_KEY, JSON.stringify([defaultAdmin]));
    return [defaultAdmin];
  }
  return JSON.parse(data);
};

export const saveUsers = (users: User[]): void => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const getCurrentUser = (): User | null => {
  const data = localStorage.getItem(SESSION_KEY);
  return data ? JSON.parse(data) : null;
};

export const login = (username: string, password: string): User | null => {
  const users = getUsers();
  const user = users.find(u => u.username === username && u.password === password);
  if (user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    return user;
  }
  return null;
};

export const logout = (): void => {
  localStorage.removeItem(SESSION_KEY);
};

// --- GESTIÓN DE CASOS CON AUDITORÍA ---
export const getCases = (): LawCase[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return [];
  return JSON.parse(data);
};

export const saveCases = (cases: LawCase[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
};

export const addCase = (newCase: Omit<LawCase, 'id' | 'codigo_interno' | 'updatedAt' | 'actuaciones' | 'alertas' | 'notas' | 'createdBy' | 'lastModifiedBy'>): void => {
  const cases = getCases();
  const user = getCurrentUser();
  const fullCase: LawCase = {
    ...newCase,
    id: Math.random().toString(36).substr(2, 9),
    codigo_interno: generateInternalCode(cases),
    updatedAt: new Date().toISOString(),
    createdBy: user?.username || 'sistema',
    lastModifiedBy: user?.username || 'sistema',
    actuaciones: [],
    alertas: [],
    notas: []
  };
  cases.unshift(fullCase);
  saveCases(cases);
};

export const updateCase = (updatedCase: LawCase): void => {
  const cases = getCases();
  const user = getCurrentUser();
  const index = cases.findIndex(c => c.id === updatedCase.id);
  if (index !== -1) {
    cases[index] = { 
      ...updatedCase, 
      updatedAt: new Date().toISOString(),
      lastModifiedBy: user?.username || 'sistema'
    };
    saveCases(cases);
  }
};

export const deleteCase = (id: string): void => {
  const cases = getCases();
  saveCases(cases.filter(c => c.id !== id));
};
