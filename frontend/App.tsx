
import React, { useState, useEffect, useCallback } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import CaseList from './components/CaseList';
import CaseForm from './components/CaseForm';
import CaseDetail from './components/CaseDetail';
import UserManagement from './components/UserManagement';
import Login from './components/Login';
import Toast from './components/Toast';
import Calendar from './components/Calendar';
import { LawCase, ViewState, User } from './types';
import * as api from './services/apiService';

interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
}

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [cases, setCases] = useState<LawCase[]>([]);
  const [casesCount, setCasesCount] = useState(0);
  const [casesPage, setCasesPage] = useState(1);
  const [selectedCase, setSelectedCase] = useState<LawCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    // Verificar si hay usuario autenticado al cargar
    const initUser = async () => {
      try {
        const user = await api.apiGetCurrentUser();
        setCurrentUser(user);
        if (user) {
          // No bloquear la UI por la carga de expedientes
          loadCases().catch((error) => {
            console.error('Error al cargar casos al iniciar:', error);
          });
        }
      } catch (error) {
        console.error('Error al verificar usuario:', error);
      } finally {
        setLoading(false);
      }
    };
    initUser();
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
  };

  const loadCases = useCallback(async (filters?: api.CasesListFilters, page: number = 1) => {
    try {
      const data = await api.apiGetCases(filters, page);
      setCases(data.results ?? []);
      setCasesCount(data.count ?? 0);
      setCasesPage(page);
    } catch (error: any) {
      console.error('Error al cargar casos:', error);
      setCases([]);
      setCasesCount(0);
      setCasesPage(1);
      showToast(error?.message || 'No se pudieron cargar los expedientes', 'error');
    }
  }, []);

  const handleLogin = async (user: User) => {
    setCurrentUser(user);
    setCurrentView('dashboard');
    try {
      // Cargar expedientes en segundo plano para mejorar UX
      loadCases().catch((error) => {
        console.error('Error al cargar casos después del login:', error);
      });
    } catch (error) {
      console.error('Error al cargar casos después del login:', error);
    }
  };

  const handleLogout = () => {
    api.apiLogout();
    setCurrentUser(null);
    setCases([]);
    setSelectedCase(null);
  };

  const handleAddCase = async (newCaseData: Omit<LawCase, 'id' | 'codigo_interno' | 'updatedAt' | 'actuaciones' | 'alertas' | 'notas' | 'createdBy' | 'lastModifiedBy' | 'created_at' | 'updated_at'>) => {
    try {
      await api.apiCreateCase(newCaseData);
      await loadCases();
      setCurrentView('cases');
      showToast('Expediente creado exitosamente', 'success');
    } catch (error: any) {
      console.error('Error al crear caso:', error);
      showToast(error?.message || 'Error al crear el expediente', 'error');
    }
  };

  const handleUpdateCase = async (updatedCase: LawCase) => {
    try {
      const updated = await api.apiUpdateCase(String(updatedCase.id), updatedCase);
      await loadCases();
      if (selectedCase && String(selectedCase.id) === String(updatedCase.id)) {
        setSelectedCase(updated);
      }
      showToast('Expediente actualizado exitosamente', 'success');
    } catch (error: any) {
      console.error('Error al actualizar caso:', error);
      showToast(error?.message || 'Error al actualizar el expediente', 'error');
    }
  };

  const handleDeleteCase = async (id: string | number) => {
    if (!confirm('¿Estás seguro de eliminar este expediente? Esta acción no se puede deshacer.')) {
      return;
    }
    try {
      await api.apiDeleteCase(String(id));
      await loadCases();
      setCurrentView('cases');
      setSelectedCase(null);
      showToast('Expediente eliminado exitosamente', 'success');
    } catch (error: any) {
      console.error('Error al eliminar caso:', error);
      showToast(error?.message || 'Error al eliminar el expediente', 'error');
    }
  };

  const navigateToCase = async (lawCase: LawCase) => {
    try {
      // Cargar el caso completo desde la API
      const fullCase = await api.apiGetCase(String(lawCase.id));
      setSelectedCase(fullCase);
      setCurrentView('case-detail');
    } catch (error) {
      console.error('Error al cargar caso:', error);
      // Si falla, usar el caso que ya tenemos
      setSelectedCase(lawCase);
      setCurrentView('case-detail');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-slate-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard cases={cases} onViewChange={setCurrentView} onSelectCase={navigateToCase} onUpdateCase={handleUpdateCase} />;
      case 'cases':
        return (
          <CaseList
            cases={cases}
            casesCount={casesCount}
            casesPage={casesPage}
            onSelectCase={navigateToCase}
            onViewChange={setCurrentView}
            onLoadCases={loadCases}
          />
        );
      case 'new-case':
        return <CaseForm onAdd={handleAddCase} onCancel={() => setCurrentView('cases')} currentUser={currentUser} />;
      case 'case-detail':
        return selectedCase ? (
          <CaseDetail 
            lawCase={selectedCase} 
            onUpdate={handleUpdateCase} 
            onBack={() => setCurrentView('cases')}
            onDelete={handleDeleteCase}
          />
        ) : (
          <CaseList
            cases={cases}
            casesCount={casesCount}
            casesPage={casesPage}
            onSelectCase={navigateToCase}
            onViewChange={setCurrentView}
            onLoadCases={loadCases}
          />
        );
      case 'users':
        return <UserManagement currentUser={currentUser} />;
      case 'calendar':
        return <Calendar cases={cases} onSelectCase={navigateToCase} onViewChange={setCurrentView} />;
      default:
        return <Dashboard cases={cases} onViewChange={setCurrentView} onSelectCase={navigateToCase} onUpdateCase={handleUpdateCase} />;
    }
  };

  return (
    <>
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
      <Layout 
        currentView={currentView} 
        onViewChange={setCurrentView} 
        onLogout={handleLogout}
        currentUser={currentUser}
      >
        {renderView()}
      </Layout>
    </>
  );
};

export default App;
