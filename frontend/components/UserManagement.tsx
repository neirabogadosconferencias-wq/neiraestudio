
import React, { useState, useEffect } from 'react';
import * as storage from '../services/storageService';
import { User } from '../types';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [newUser, setNewUser] = useState({ username: '', password: '', isAdmin: false });

  useEffect(() => {
    setUsers(storage.getUsers());
  }, []);

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.username || !newUser.password) return;
    const user: User = { 
      id: Math.random().toString(36).substr(2, 9), 
      ...newUser 
    };
    const updated = [...users, user];
    setUsers(updated);
    storage.saveUsers(updated);
    setNewUser({ username: '', password: '', isAdmin: false });
  };

  const deleteUser = (id: string) => {
    if (id === 'admin') return alert('No se puede eliminar el administrador principal');
    const updated = users.filter(u => u.id !== id);
    setUsers(updated);
    storage.saveUsers(updated);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <h2 className="text-3xl font-serif font-bold text-slate-900">Gestión de Usuarios</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">Nuevo Usuario</h3>
          <form onSubmit={handleAddUser} className="space-y-4">
            <input className="w-full bg-slate-50 p-3 rounded-xl border-none outline-none font-bold text-sm" placeholder="Usuario" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} />
            <input className="w-full bg-slate-50 p-3 rounded-xl border-none outline-none font-bold text-sm" placeholder="Contraseña" type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={newUser.isAdmin} onChange={e => setNewUser({...newUser, isAdmin: e.target.checked})} />
              <span className="text-xs font-bold uppercase text-slate-500">Es Administrador</span>
            </label>
            <button type="submit" className="w-full bg-black text-white py-3 rounded-xl font-bold uppercase text-[10px] tracking-widest">Crear Usuario</button>
          </form>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50">
              <tr className="text-[10px] font-black uppercase text-slate-400">
                <th className="px-6 py-4">Usuario</th>
                <th className="px-6 py-4">Rol</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.map(u => (
                <tr key={u.id}>
                  <td className="px-6 py-4 font-bold text-sm">{u.username}</td>
                  <td className="px-6 py-4 text-[10px] font-black uppercase text-orange-600">{u.isAdmin ? 'Admin' : 'Usuario'}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => deleteUser(u.id)} className="text-red-400 hover:text-red-600 font-bold">×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
