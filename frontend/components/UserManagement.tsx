
import React, { useState, useEffect } from 'react';
import * as api from '../services/apiService';
import { User, UserRole } from '../types';

interface UserManagementProps {
  currentUser: User | null;
}

const UserManagement: React.FC<UserManagementProps> = ({ currentUser }) => {
  const isAdmin = currentUser?.isAdmin || currentUser?.is_admin || false;
  const [users, setUsers] = useState<User[]>([]);
  const [newUser, setNewUser] = useState({ username: '', password: '', rol: 'usuario' as UserRole });
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const loadedUsers = await api.apiGetUsers();
      // Si loadedUsers es un array (incluso vacío), está bien
      if (Array.isArray(loadedUsers)) {
        setUsers(loadedUsers);
      } else {
        // Si no es un array, establecer array vacío
        setUsers([]);
      }
    } catch (error: any) {
      console.error('Error al cargar usuarios:', error);
      const errorMessage = error?.message || 'Error al cargar usuarios';
      
      // Solo mostrar alerta si es un error real (no un array vacío)
      if (errorMessage.includes('403') || errorMessage.includes('permission') || errorMessage.includes('permisos')) {
        alert('No tienes permisos para acceder a esta sección. Solo los administradores pueden gestionar usuarios.');
      } else if (!errorMessage.includes('200') && !errorMessage.includes('OK')) {
        // Solo mostrar error si no es un código 200
        alert(`Error al cargar usuarios: ${errorMessage}`);
      }
      // Si hay error pero es menor, establecer array vacío
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.username.trim() || !newUser.password.trim()) {
      setSuccessMessage(null);
      alert('Por favor, completa todos los campos');
      return;
    }
    if (newUser.password.length < 4) {
      setSuccessMessage(null);
      alert('La contraseña debe tener al menos 4 caracteres');
      return;
    }
    try {
      setCreating(true);
      setSuccessMessage(null);
      const created = await api.apiCreateUser({
        username: newUser.username.trim(),
        password: newUser.password,
        rol: newUser.rol,
      });
      setUsers([...users, created]);
      setNewUser({ username: '', password: '', rol: 'usuario' });
      setSuccessMessage(`Usuario "${created.username}" creado exitosamente como ${getRoleLabel(created.rol || 'usuario')}`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error: any) {
      console.error('Error al crear usuario:', error);
      const errorMessage = error?.message || 'Error al crear el usuario. Por favor, intenta nuevamente.';
      setSuccessMessage(null);
      alert(errorMessage);
    } finally {
      setCreating(false);
    }
  };
  
  const getRoleLabel = (rol: UserRole | string | undefined): string => {
    switch (rol) {
      case 'admin': return 'Administrador';
      case 'abogado': return 'Abogado';
      case 'usuario': return 'Usuario';
      default: return 'Usuario';
    }
  };
  
  const getRoleColor = (rol: UserRole | string | undefined, isAdmin?: boolean): string => {
    // Compatibilidad con usuarios antiguos que solo tienen isAdmin
    if (isAdmin) return 'bg-orange-100 text-orange-600';
    
    switch (rol) {
      case 'admin': return 'bg-orange-100 text-orange-600';
      case 'abogado': return 'bg-blue-100 text-blue-600';
      case 'usuario': return 'bg-slate-100 text-slate-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  };
  
  const getRoleBadgeColor = (rol: UserRole | string | undefined, isAdmin?: boolean): string => {
    if (isAdmin) return 'bg-orange-500';
    
    switch (rol) {
      case 'admin': return 'bg-orange-500';
      case 'abogado': return 'bg-blue-500';
      case 'usuario': return 'bg-slate-400';
      default: return 'bg-slate-400';
    }
  };

  const deleteUser = async (id: string | number) => {
    const idStr = String(id);
    const user = users.find(u => String(u.id) === idStr);
    
    if (idStr === '1' || idStr === 'admin') {
      alert('No se puede eliminar el administrador principal');
      return;
    }
    
    const userName = user?.username || 'este usuario';
    if (!confirm(`¿Estás seguro de eliminar al usuario "${userName}"?\n\nEsta acción no se puede deshacer.`)) {
      return;
    }
    
    try {
      setDeletingId(id);
      setSuccessMessage(null);
      await api.apiDeleteUser(idStr);
      setUsers(users.filter(u => String(u.id) !== idStr));
      setSuccessMessage(`Usuario "${userName}" eliminado exitosamente`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error: any) {
      console.error('Error al eliminar usuario:', error);
      setSuccessMessage(null);
      alert(error.message || 'Error al eliminar el usuario.');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-fadeIn">
        <h2 className="text-3xl font-serif font-bold text-slate-900">Gestión de Usuarios</h2>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-slate-600">Cargando usuarios...</p>
        </div>
      </div>
    );
  }

  // Si no es admin, mostrar mensaje de acceso denegado
  if (!isAdmin) {
    return (
      <div className="space-y-8 animate-fadeIn">
        <h2 className="text-3xl font-serif font-bold text-slate-900">Gestión de Usuarios</h2>
        <div className="bg-white p-12 rounded-3xl border border-slate-100 shadow-sm text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
          </div>
          <h3 className="text-xl font-black text-slate-900 mb-2">Acceso Restringido</h3>
          <p className="text-slate-600 font-bold">Solo los administradores pueden gestionar usuarios.</p>
          <p className="text-sm text-slate-400 mt-2">Si necesitas acceso, contacta a un administrador del sistema.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-serif font-bold text-slate-900">Gestión de Usuarios</h2>
        <span className="px-4 py-2 bg-orange-100 text-orange-600 rounded-xl text-[10px] font-black uppercase tracking-widest">
          Solo Administradores
        </span>
      </div>

      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-6 py-4 rounded-2xl flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
            </svg>
            <span className="text-sm font-bold">{successMessage}</span>
          </div>
          <button 
            onClick={() => setSuccessMessage(null)}
            className="text-green-500 hover:text-green-700"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
            </svg>
            Nuevo Usuario
          </h3>
          <form onSubmit={handleAddUser} className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Nombre de Usuario</label>
              <input 
                className="w-full bg-slate-50 p-3 rounded-xl border border-slate-100 outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-bold text-sm transition-all" 
                placeholder="Ej: jperez" 
                value={newUser.username} 
                onChange={e => setNewUser({...newUser, username: e.target.value})} 
                required
                disabled={creating}
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Contraseña</label>
              <input 
                className="w-full bg-slate-50 p-3 rounded-xl border border-slate-100 outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-bold text-sm transition-all" 
                placeholder="Mínimo 4 caracteres" 
                type="password" 
                value={newUser.password} 
                onChange={e => setNewUser({...newUser, password: e.target.value})} 
                required
                minLength={4}
                disabled={creating}
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Rol del Usuario</label>
              <select
                className="w-full bg-slate-50 p-3 rounded-xl border border-slate-100 outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-bold text-sm transition-all"
                value={newUser.rol}
                onChange={e => setNewUser({...newUser, rol: e.target.value as UserRole})}
                disabled={creating}
              >
                <option value="usuario">Usuario - Acceso básico al sistema</option>
                <option value="abogado">Abogado - Acceso completo a expedientes</option>
                <option value="admin">Administrador - Control total del sistema</option>
              </select>
              <p className="text-[9px] text-slate-400 mt-2">
                {newUser.rol === 'admin' && 'Puede gestionar usuarios y asignar abogados responsables'}
                {newUser.rol === 'abogado' && 'Puede acceder a todos los expedientes y gestionarlos'}
                {newUser.rol === 'usuario' && 'Acceso básico para consultar expedientes'}
              </p>
            </div>
            <button 
              type="submit" 
              disabled={creating || !newUser.username.trim() || !newUser.password.trim()}
              className="w-full bg-black text-white py-3 rounded-xl font-bold uppercase text-[10px] tracking-widest disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-800 transition-all flex items-center justify-center gap-2"
            >
              {creating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/>
                  </svg>
                  Crear Usuario
                </>
              )}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Usuarios Registrados</h3>
            <p className="text-[10px] text-slate-400 mt-1">Total: {users.length} usuario{users.length !== 1 ? 's' : ''}</p>
          </div>
          <table className="w-full text-left">
            <thead className="bg-zinc-900 text-white">
              <tr className="text-[10px] font-black uppercase tracking-widest">
                <th className="px-6 py-4">Usuario</th>
                <th className="px-6 py-4">Rol</th>
                <th className="px-6 py-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <svg className="w-12 h-12 text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
                      </svg>
                      <p className="text-slate-400 font-bold text-sm">No hay usuarios registrados</p>
                      <p className="text-slate-300 text-xs mt-1">Crea el primer usuario del sistema</p>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map(u => {
                  const isMainAdmin = String(u.id) === '1';
                  const userIsAdmin = u.isAdmin || u.is_admin;
                  const userRol = u.rol || (userIsAdmin ? 'admin' : 'usuario');
                  const isDeleting = deletingId === u.id;
                  
                  return (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-xs uppercase ${getRoleBadgeColor(userRol, userIsAdmin)}`}>
                            {u.username?.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-slate-900">{u.username}</p>
                            {isMainAdmin && (
                              <p className="text-[9px] text-slate-400 font-bold uppercase">Administrador Principal</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${getRoleColor(userRol, userIsAdmin)}`}>
                          {getRoleLabel(userRol)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => deleteUser(u.id)} 
                          disabled={isDeleting || isMainAdmin}
                          className="px-4 py-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl font-black text-[10px] uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-2 mx-auto"
                          title={isMainAdmin ? 'No se puede eliminar el administrador principal' : 'Eliminar usuario'}
                        >
                          {isDeleting ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-500"></div>
                              Eliminando...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                              </svg>
                              Eliminar
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
