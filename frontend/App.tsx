
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import CaseList from './components/CaseList';
import CaseForm from './components/CaseForm';
import CaseDetail from './components/CaseDetail';
import UserManagement from './components/UserManagement';
import Login from './components/Login';
import { LawCase, ViewState, User } from './types';
import * as storage from './services/storageService';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(storage.getCurrentUser());
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [cases, setCases] = useState<LawCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<LawCase | null>(null);

  useEffect(() => {
    if (currentUser) {
      setCases(storage.getCases());
    }
  }, [currentUser]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    storage.logout();
    setCurrentUser(null);
  };

  // Fix: handleAddCase now correctly accepts the partial case data (NewCaseInput) required by storage.addCase
  const handleAddCase = (newCaseData: Omit<LawCase, 'id' | 'codigo_interno' | 'updatedAt' | 'actuaciones' | 'alertas' | 'notas' | 'createdBy' | 'lastModifiedBy'>) => {
    storage.addCase(newCaseData);
    setCases(storage.getCases());
    setCurrentView('cases');
  };

  const handleUpdateCase = (updatedCase: LawCase) => {
    storage.updateCase(updatedCase);
    const updatedCases = storage.getCases();
    setCases(updatedCases);
    if (selectedCase && selectedCase.id === updatedCase.id) {
      setSelectedCase(updatedCase);
    }
  };

  const handleDeleteCase = (id: string) => {
    storage.deleteCase(id);
    setCases(storage.getCases());
    setCurrentView('cases');
  };

  const navigateToCase = (lawCase: LawCase) => {
    setSelectedCase(lawCase);
    setCurrentView('case-detail');
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard cases={cases} onViewChange={setCurrentView} onSelectCase={navigateToCase} onUpdateCase={handleUpdateCase} />;
      case 'cases':
        return <CaseList cases={cases} onSelectCase={navigateToCase} onViewChange={setCurrentView} />;
      case 'new-case':
        return <CaseForm onAdd={handleAddCase} onCancel={() => setCurrentView('cases')} />;
      case 'case-detail':
        return selectedCase ? (
          <CaseDetail 
            lawCase={selectedCase} 
            onUpdate={handleUpdateCase} 
            onBack={() => setCurrentView('cases')}
            onDelete={handleDeleteCase}
          />
        ) : <CaseList cases={cases} onSelectCase={navigateToCase} onViewChange={setCurrentView} />;
      case 'users':
        return <UserManagement />;
      default:
        return <Dashboard cases={cases} onViewChange={setCurrentView} onSelectCase={navigateToCase} onUpdateCase={handleUpdateCase} />;
    }
  };

  return (
    <Layout currentView={currentView} onViewChange={setCurrentView} onLogout={handleLogout}>
      {renderView()}
    </Layout>
  );
};

export default App;
