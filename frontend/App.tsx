import React, { useState, useEffect, useCallback, useRef } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import CaseList from './components/CaseList';
import CaseForm from './components/CaseForm';
import CaseDetail from './components/CaseDetail';
import UserManagement from './components/UserManagement';
import Login from './components/Login';
import Toast from './components/Toast';
import Calendar from './components/Calendar';
import { LawCase, ViewState, User, ActuacionTemplate, CaseTag, Cliente, DashboardStats } from './types';
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
  const [templates, setTemplates] = useState<ActuacionTemplate[]>([]);
  const [tags, setTags] = useState<CaseTag[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [dashboardStatsCache, setDashboardStatsCache] = useState<DashboardStats | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
  };

  const loadCases = useCallback(async (filters?: api.CasesListFilters, page: number = 1) => {
    try {
      const data = await api.apiGetCases(filters, page);
      setCases(data.results ?? []);
      setCasesCount(data.count ?? 0);
      setCasesPage(page);
      if (data.clientes && data.clientes.length > 0) setClientes(data.clientes);
    } catch (error: any) {
      console.error('Error al cargar casos:', error);
      setCases([]);
      setCasesCount(0);
      setCasesPage(1);
      showToast(error?.message || 'No se pudieron cargar los expedientes', 'error');
    }
  }, []);

  useEffect(() => {
    const initUser = async () => {
      try {
        const user = await api.apiGetCurrentUser();
        setCurrentUser(user);
      } catch (error) {
        console.error('Error al verificar usuario:', error);
      } finally {
        setLoading(false);
      }
    };
    initUser();
  }, []);

  // Cargar expedientes: Calendario desde App; Expedientes lo hace CaseList (evita doble request)
  useEffect(() => {
    if (!currentUser) return;
    if (currentView === 'calendar' && cases.length === 0) {
      loadCases().catch((error) => {
        console.error('Error al cargar expedientes:', error);
      });
    }
  }, [currentUser, currentView, cases.length, loadCases]);

  // Cache de templates y tags (datos estáticos, cargar una vez al tener usuario)
  useEffect(() => {
    if (!currentUser) return;
    if (templates.length === 0 && tags.length === 0) {
      Promise.all([api.apiGetActuacionTemplates(), api.apiGetTags()])
        .then(([t, g]) => {
          setTemplates(t || []);
          setTags(g || []);
        })
        .catch(() => {});
    }
  }, [currentUser, templates.length, tags.length]);

  // Fallback clientes: solo si loadCases no los incluyó (API antigua)
  useEffect(() => {
    if (!currentUser || currentView !== 'cases' || clientes.length > 0 || cases.length === 0) return;
    api.apiGetClientes().then(setClientes).catch(() => {});
  }, [currentUser, currentView, clientes.length, cases.length]);

  const handleLogin = async (user: User) => {
    setCurrentUser(user);
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    api.apiLogout();
    setCurrentUser(null);
    setCases([]);
    setSelectedCase(null);
    setTemplates([]);
    setTags([]);
    setClientes([]);
    setDashboardStatsCache(null);
  };

  const preloadDashboardInProgress = useRef(false);

  const loadDashboard = useCallback(async () => {
    try {
      const stats = await api.apiGetDashboard();
      setDashboardStatsCache(stats);
      return stats;
    } catch (e) {
      console.error('Error al cargar dashboard:', e);
      return null;
    } finally {
      preloadDashboardInProgress.current = false;
    }
  }, []);

  const safePreloadDashboard = useCallback(() => {
    if (dashboardStatsCache) return;
    if (preloadDashboardInProgress.current) return;
    preloadDashboardInProgress.current = true;
    loadDashboard();
  }, [dashboardStatsCache, loadDashboard]);

  const preloadCasesInProgress = useRef(false);

  const safePreloadCases = useCallback(() => {
    if (cases.length > 0) return;
    if (preloadCasesInProgress.current) return;
    preloadCasesInProgress.current = true;
    loadCases()
      .catch(() => {})
      .finally(() => {
        preloadCasesInProgress.current = false;
      });
  }, [cases.length, loadCases]);

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

  const handleUpdateCase = (updatedCase: LawCase) => {
    setCases(prev => prev.map(c => String(c.id) === String(updatedCase.id) ? updatedCase : c));
    if (selectedCase && String(selectedCase.id) === String(updatedCase.id)) {
      setSelectedCase(updatedCase);
    }
    showToast('Expediente actualizado exitosamente', 'success');
  };

  const handleDeleteCase = async (id: string | number) => {
    if (!confirm('¿Estás seguro de eliminar este expediente? Esta acción no se puede deshacer.')) {
      return;
    }
    try {
      await api.apiDeleteCase(String(id));
      setCases(prev => prev.filter(c => String(c.id) !== String(id)));
      setCasesCount(prev => Math.max(0, prev - 1));
      setCurrentView('cases');
      setSelectedCase(null);
      showToast('Expediente eliminado exitosamente', 'success');
    } catch (error: any) {
      console.error('Error al eliminar caso:', error);
      showToast(error?.message || 'Error al eliminar el expediente', 'error');
    }
  };

  const navigateToCase = (lawCase: LawCase) => {
    setSelectedCase(lawCase);
    setCurrentView('case-detail');
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
        return (
          <Dashboard
            cases={cases}
            onViewChange={setCurrentView}
            onSelectCase={navigateToCase}
            onUpdateCase={handleUpdateCase}
            initialStats={dashboardStatsCache}
            onStatsLoaded={setDashboardStatsCache}
            currentUser={currentUser}
          />
        );
      case 'cases':
        return (
          <CaseList
            cases={cases}
            casesCount={casesCount}
            casesPage={casesPage}
            onSelectCase={navigateToCase}
            onViewChange={setCurrentView}
            onLoadCases={loadCases}
            clientesProp={clientes}
            tagsProp={tags}
          />
        );
      case 'new-case':
        return <CaseForm onAdd={handleAddCase} onCancel={() => setCurrentView('cases')} currentUser={currentUser} />;
      case 'case-detail':
        return selectedCase ? (
          <CaseDetail
            lawCase={selectedCase}
            currentUser={currentUser}
            templates={templates}
            tags={tags}
            onUpdate={handleUpdateCase}
            onBack={() => setCurrentView('cases')}
            onDelete={handleDeleteCase}
            onEditSaved={() => showToast('Cambios guardados', 'success')}
          />
        ) : (
          <CaseList
            cases={cases}
            casesCount={casesCount}
            casesPage={casesPage}
            onSelectCase={navigateToCase}
            onViewChange={setCurrentView}
            onLoadCases={loadCases}
            clientesProp={clientes}
            tagsProp={tags}
          />
        );
      case 'users':
        return <UserManagement currentUser={currentUser} />;
      case 'calendar':
        return <Calendar cases={cases} onSelectCase={navigateToCase} onViewChange={setCurrentView} />;
      default:
        return (
          <Dashboard
            cases={cases}
            onViewChange={setCurrentView}
            onSelectCase={navigateToCase}
            onUpdateCase={handleUpdateCase}
            initialStats={dashboardStatsCache}
            onStatsLoaded={setDashboardStatsCache}
          />
        );
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
        onPreloadCases={cases.length === 0 ? safePreloadCases : undefined}
        onPreloadDashboard={!dashboardStatsCache ? safePreloadDashboard : undefined}
      >
        {renderView()}
      </Layout>
    </>
  );
};

export default App;
