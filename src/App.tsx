import { useState } from 'react';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './components/Dashboard';
import Products from './components/Products';
import Login from './components/Login';
import FinancesHub from './components/FinancesHub';
import AuditHub from './components/AuditHub';
import Team from './components/Team';
import ServiceOrders from './components/ServiceOrders';
import AdminSettings from './components/AdminSettings';
import About from './components/About';
import { NotificationProvider } from './contexts/NotificationContext';
import { TeamProvider, useTeam } from './contexts/TeamContext';
import { TransactionProvider } from './contexts/TransactionContext';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { PWAProvider } from './contexts/PWAContext';
import { useOnlinePresence } from './hooks/useOnlinePresence';
import { motion, AnimatePresence } from 'framer-motion';

const pageVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

const pageTransition = {
  type: "tween",
  ease: "anticipate",
  duration: 0.3
} as const;

function AppContent() {
  const [activePage, setActivePage] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const { currentUser } = useTeam();
  const { t } = useLanguage();

  // Track user online presence globally
  useOnlinePresence();

  // If not authenticated, show Login screen
  if (!currentUser) {
    return <Login onLogin={() => { }} />;
  }

  const renderPage = () => {
    const role = currentUser?.role || 'employee';

    switch (activePage) {
      case 'dashboard':
        return <Dashboard searchQuery={searchQuery} />;
      case 'inventory':
        return <Products searchQuery={searchQuery} />;
      case 'finances_hub':
        return (role === 'admin' || role === 'manager') ? <FinancesHub /> : <Dashboard searchQuery={searchQuery} />;
      case 'audit_hub':
        return (role === 'admin' || role === 'manager') ? <AuditHub /> : <Dashboard searchQuery={searchQuery} />;
      case 'services':
        return <ServiceOrders />;
      case 'team':
        return role === 'admin' ? <Team /> : <Dashboard searchQuery={searchQuery} />;
      case 'settings':
        return role === 'admin' ? <AdminSettings /> : <Dashboard searchQuery={searchQuery} />;
      case 'about':
        return <About />;
      default:
        return <Dashboard searchQuery={searchQuery} />;
    }
  };

  const getPageTitle = () => {
    switch (activePage) {
      case 'dashboard':
        return t('dashboard');
      case 'inventory':
        return t('inventory');
      case 'finances_hub':
        return "Finanças & Fluxos";
      case 'audit_hub':
        return "Movimentações & Auditoria";
      case 'settings':
        return t('settings');
      case 'about':
        return "Sobre o Sistema";
      default:
        return activePage.charAt(0).toUpperCase() + activePage.slice(1);
    }
  };

  return (
    <MainLayout
      activeId={activePage}
      onNavigate={setActivePage}
      title={getPageTitle()}
      onSearch={setSearchQuery}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={activePage}
          initial="initial"
          animate="animate"
          exit="exit"
          variants={pageVariants}
          transition={pageTransition}
          className="w-full"
        >
          {renderPage()}
        </motion.div>
      </AnimatePresence>
    </MainLayout>
  );
}

function App() {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <LanguageProvider>
          <TeamProvider>
            <TransactionProvider>
              <PWAProvider>
                <AppContent />
              </PWAProvider>
            </TransactionProvider>
          </TeamProvider>
        </LanguageProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
}

export default App;
