import { useState, useEffect } from 'react';
import logo from '../../assets/logo.png';
import { Search, Bell, Settings, X, Check, AlertTriangle, Info, LogOut, Wifi, WifiOff, Activity, Sun, Moon } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';
import { useTeam } from '../../contexts/TeamContext';
import { api } from '../../lib/api';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { searchProducts } from '../../lib/search';
import { AccountSettingsModal } from '../AccountSettingsModal';
import { LiveActivityPanel } from './LiveActivityPanel';
import { socket } from '../../lib/api';

interface HeaderProps {
  title: string;
  onSearch?: (query: string) => void;
}

export default function Header({ title, onSearch }: HeaderProps) {
  const { notifications, clearNotifications, addNotification } = useNotifications();
  const { currentUser, logout } = useTeam();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [localQuery, setLocalQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const isOnline = useOnlineStatus();
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const isAdmin = currentUser?.role === 'admin';

  // Live Activity Monitoring State
  const [showLiveFeed, setShowLiveFeed] = useState(false);
  const [liveLogs, setLiveLogs] = useState<any[]>([]);
  const [liveUnreadCount, setLiveUnreadCount] = useState(0);

  useEffect(() => {
    if (!isAdmin) return;

    socket.on('new-log', (log: any) => {
      setLiveLogs(prev => [log, ...prev].slice(0, 50));
      if (!showLiveFeed) {
        setLiveUnreadCount(prev => prev + 1);
      }
    });

    return () => {
      socket.off('new-log');
    };
  }, [isAdmin, showLiveFeed]);

  useEffect(() => {
    const checkLowStock = async () => {
      try {
        const products = await api.products.list();
        const productList = Array.isArray(products) ? products : [];
        setAllProducts(productList);
        const lowStock = productList.filter((p: any) => p.stock <= (p.minStock || 0));
        setLowStockCount(lowStock.length);

        // Optionally add a single notification if there are low stock items
        if (lowStock.length > 0) {
          // Check if we already notified this session to avoid spam
          const lastAlert = sessionStorage.getItem('lowStockAlert');
          if (!lastAlert) {
            addNotification(`${lowStock.length} produtos estão com estoque baixo ou esgotado!`, 'warning');
            sessionStorage.setItem('lowStockAlert', 'true');
          }
        }
      } catch (error) {
        console.error('Error checking stock:', error);
      }
    };

    checkLowStock();
    // Check every 5 minutes
    const interval = setInterval(checkLowStock, 300000);
    return () => clearInterval(interval);
  }, []);

  const handleSearchChange = (query: string) => {
    setLocalQuery(query);
    onSearch?.(query);

    if (query.trim().length > 0) {
      const filtered = searchProducts(allProducts, query).slice(0, 5); // Limit to top 5 for the dropdown
      setSearchResults(filtered);
      setIsSearching(true);
      setSelectedIndex(-1);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isSearching || searchResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < searchResults.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      setIsSearching(false);
      const selected = searchResults[selectedIndex];
      setLocalQuery(selected.name);
      onSearch?.(selected.name);
    } else if (e.key === 'Escape') {
      setIsSearching(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <Check className="w-4 h-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'error': return <X className="w-4 h-4 text-red-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <header className="h-16 lg:h-24 fixed top-0 right-0 left-0 lg:left-72 z-[100] transition-all duration-500 bg-[var(--bg-panel)] shadow-sm border-b border-[var(--border-subtle)]">
      <div className="h-full px-3 lg:px-10 flex items-center justify-between gap-2 lg:gap-8">
        <div className="flex-1 flex items-center gap-2 lg:gap-4 ml-14 lg:ml-0 overflow-hidden">
          <div className="flex-none flex items-center gap-1.5 lg:gap-4">
            <h2 className="text-[14px] lg:text-[16px] font-black tracking-tight whitespace-nowrap uppercase italic text-[#FF4700]">{t('brandName').split(' ')[0]}</h2>
            <div className="h-3 w-px bg-[var(--border-subtle)] hidden md:block" />
            <h3 className="text-[10px] lg:text-[13px] font-bold text-[var(--text-muted)] tracking-tight whitespace-nowrap hidden md:block">{title}</h3>

            <div className={`flex items-center gap-2 px-2 py-1 lg:py-1.5 rounded-xl text-[8px] lg:text-[10px] font-black uppercase tracking-[0.1em] border transition-all duration-500 shadow-sm ${isOnline ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100 animate-pulse'
              }`}>
              <div className="relative flex items-center justify-center shrink-0">
                <div className={`w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                {isOnline && <div className="absolute w-2 h-2 rounded-full bg-emerald-400 animate-ping opacity-75" />}
              </div>
              <div className="flex items-center gap-1 lg:gap-2">
                {isOnline ? <Wifi className="w-2.5 h-2.5 lg:w-3.5 lg:h-3.5" /> : <WifiOff className="w-2.5 h-2.5 lg:w-3.5 lg:h-3.5" />}
                <span className="hidden sm:inline">Sistema {isOnline ? 'Online' : 'Offline'}</span>
                <span className="sm:hidden">{isOnline ? 'ON' : 'OFF'}</span>
              </div>
            </div>
          </div>

          <div
            className={`flex-1 relative group transition-all focus-within:z-50 ${isSearching ? 'z-50' : 'z-10'}`}
          >
            <div className="absolute left-3 lg:left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 lg:gap-3">
              <Search className="w-3.5 h-3.5 lg:w-6 lg:h-6 text-[var(--text-muted)] group-focus-within:text-[#FF4700] transition-colors" />
              <div className="hidden xs:block w-px h-3 lg:h-5 bg-[var(--border-subtle)]" />
            </div>
            <input
              id="global-search-input"
              type="text"
              placeholder={language === 'pt' ? "Busca..." : "Search..."}
              value={localQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => localQuery.length > 0 && setIsSearching(true)}
              className="w-full pl-8 lg:pl-16 pr-3 py-1.5 lg:py-4 bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-lg lg:rounded-[22px] text-[11px] lg:text-[15px] font-bold lg:font-black text-[var(--text-main)] focus:outline-none focus:bg-[var(--bg-panel)] focus:border-[#FF4700] focus:ring-4 focus:ring-[#FF4700]/5 transition-all placeholder:text-[var(--text-muted)]"
            />


            {/* Instant Results Dropdown */}
            {isSearching && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-3 bg-[var(--bg-panel)] rounded-3xl shadow-2xl border border-[var(--border-subtle)] overflow-hidden z-[110] animate-in fade-in zoom-in-95 backdrop-blur-xl">
                <div className="p-4 bg-[var(--bg-canvas)]/80 border-b border-[var(--border-subtle)] flex items-center justify-between">
                  <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Resultados Sugeridos</span>
                  <span className="text-[9px] font-bold text-[#FF4700] uppercase tracking-tighter bg-orange-100/50 px-2 py-1 rounded-lg">Instantâneo</span>
                </div>
                <div className="py-2">
                  {searchResults.map((product, index) => (
                    <button
                      key={product.id}
                      onClick={() => {
                        handleSearchChange(product.name);
                        setIsSearching(false);
                      }}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-all ${selectedIndex === index ? 'bg-[#FF4700]/5 scale-[0.99] translate-x-1' : 'hover:bg-[var(--bg-canvas)]'
                        }`}
                    >
                      <div className="w-12 h-12 rounded-xl bg-[var(--bg-canvas)] overflow-hidden border border-[var(--border-subtle)] shrink-0">
                        <img
                          src={product.image_url || logo}
                          alt=""
                          className="w-full h-full object-cover grayscale"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-black text-[var(--text-main)] truncate">{product.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-black text-[#FF4700] uppercase tracking-wider bg-orange-50 px-1.5 py-0.5 rounded">
                            ID: {product.id.slice(0, 8).toUpperCase()}
                          </span>
                          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">
                            • {product.category || 'Geral'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[15px] font-black text-[var(--text-main)] leading-none">MT {product.price.toFixed(2)}</p>
                        <div className={`inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 rounded-full ${product.stock > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                          <div className={`w-1 h-1 rounded-full ${product.stock > 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          <span className="text-[10px] font-black uppercase tracking-tighter">
                            {product.stock > 0 ? `${product.stock} em estoque` : 'Esgotado'}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="p-4 bg-[var(--bg-canvas)]/80 border-t border-[var(--border-subtle)] text-center">
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                    Pressione <span className="text-[#FF4700]">ESC</span> para fechar
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 lg:gap-6">
          <div className="flex items-center gap-1 relative">
            {lowStockCount > 0 && (
              <div className="flex items-center gap-1 px-2 lg:px-3 py-1.5 bg-orange-50 text-orange-600 rounded-xl border border-orange-100 animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                <span className="text-[9px] lg:text-[10px] font-black hidden sm:inline">{lowStockCount} Alertas</span>
                <span className="text-[9px] font-black sm:hidden">{lowStockCount}</span>
              </div>
            )}

            {isAdmin && (
              <div className="relative">
                <button
                  onClick={() => {
                    setShowLiveFeed(!showLiveFeed);
                    if (!showLiveFeed) setLiveUnreadCount(0);
                  }}
                  className={`relative p-2 lg:p-2.5 rounded-xl transition-all group ${showLiveFeed ? 'bg-indigo-50 text-indigo-600' : 'text-[var(--text-muted)] hover:text-indigo-600 hover:bg-[var(--bg-canvas)]'}`}
                  title="Monitoramento ao Vivo"
                >
                  <Activity className={`w-4 h-4 lg:w-5 lg:h-5 ${liveUnreadCount > 0 ? 'animate-pulse' : ''}`} />
                  {liveUnreadCount > 0 && (
                    <span className="absolute top-2 lg:top-2.5 right-2 lg:right-2.5 w-3.5 h-3.5 lg:w-4 lg:h-4 bg-indigo-600 text-[9px] lg:text-[10px] font-black text-white flex items-center justify-center rounded-full border-2 border-white animate-bounce">
                      {liveUnreadCount}
                    </span>
                  )}
                </button>

                <LiveActivityPanel
                  isOpen={showLiveFeed}
                  onClose={() => setShowLiveFeed(false)}
                  logs={liveLogs}
                />
              </div>
            )}

            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 lg:p-2.5 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-canvas)] rounded-xl transition-all group"
            >
              <Bell className="w-4 h-4 lg:w-5 lg:h-5" />
              {notifications.length > 0 && (
                <span className="absolute top-2 lg:top-2.5 right-2 lg:right-2.5 w-3.5 h-3.5 lg:w-4 lg:h-4 bg-[#FF4700] text-[9px] lg:text-[10px] font-black text-white flex items-center justify-center rounded-full border-2 border-white">
                  {notifications.length}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute top-full right-0 mt-3 w-64 lg:w-80 bg-[var(--bg-panel)] rounded-2xl shadow-xl border border-[var(--border-subtle)] overflow-hidden z-50 animate-in fade-in zoom-in-95 backdrop-blur-xl">
                <div className="p-3 lg:p-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-canvas)]/50">
                  <h3 className="font-bold text-[var(--text-main)] text-xs lg:text-sm">Notificações</h3>
                  {notifications.length > 0 && (
                    <button onClick={clearNotifications} className="text-[10px] lg:text-xs text-[#FF4700] font-bold hover:underline">
                      Limpar
                    </button>
                  )}
                </div>
                <div className="max-h-[250px] lg:max-h-[300px] overflow-y-auto custom-scrollbar">
                  {notifications.length === 0 ? (
                    <div className="p-6 lg:p-8 text-center text-[var(--text-muted)] text-xs lg:text-sm font-medium">
                      Nenhuma notificação
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div key={notification.id} className="p-3 lg:p-4 border-b border-[var(--border-subtle)] hover:bg-[var(--bg-canvas)] transition-colors">
                        <div className="flex gap-2 lg:gap-3">
                          <div className={`mt-0.5 w-5 h-5 lg:w-6 lg:h-6 rounded-lg flex items-center justify-center bg-[var(--bg-canvas)] shrink-0`}>
                            {getIcon(notification.type)}
                          </div>
                          <div>
                            <p className="text-[12px] lg:text-sm font-medium text-[var(--text-main)] leading-snug">{notification.message}</p>
                            <span className="text-[9px] lg:text-[10px] font-bold text-[var(--text-muted)] mt-1 block">
                              {new Date(notification.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            <button className="hidden sm:block p-2.5 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-canvas)] rounded-xl transition-all">
              <Settings className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-0.5 lg:gap-1 bg-[var(--bg-canvas)] p-0.5 lg:p-1 rounded-xl ml-1 lg:ml-2">
              <button
                onClick={() => setLanguage('pt')}
                className={`w-7 h-7 lg:w-8 lg:h-8 flex items-center justify-center rounded-lg text-[8px] lg:text-[10px] font-black transition-all ${language === 'pt' ? 'bg-[var(--bg-panel)] text-[#FF4700] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
              >
                PT
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`w-7 h-7 lg:w-8 lg:h-8 flex items-center justify-center rounded-lg text-[8px] lg:text-[10px] font-black transition-all ${language === 'en' ? 'bg-[var(--bg-panel)] text-[#FF4700] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
              >
                EN
              </button>
            </div>

            <button
              onClick={toggleTheme}
              className="p-2 lg:p-2.5 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-canvas)] rounded-xl transition-all"
              title={theme === 'light' ? 'Mudar para modo escuro' : 'Mudar para modo claro'}
            >
              {theme === 'light' ? <Moon className="w-4 h-4 lg:w-5 lg:h-5" /> : <Sun className="w-4 h-4 lg:w-5 lg:h-5" />}
            </button>
          </div>

          <div className="h-6 lg:h-8 w-px bg-[var(--border-subtle)] mx-1 lg:mx-0" />

          <div className="hidden xl:flex flex-col items-end -space-y-1">
            <span className="text-[10px] font-black text-[#FF4700] uppercase tracking-[0.3em] italic">{t('brandName').split(' ')[0]}</span>
            <span className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{t('systemActive')}</span>
          </div>

          <div className="flex items-center gap-2 lg:gap-3 pl-1 lg:pl-2 group relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-8 h-8 lg:w-10 lg:h-10 rounded-xl overflow-hidden border border-[var(--border-subtle)] hover:border-[#FF4700]/50 transition-all flex items-center justify-center bg-[var(--bg-canvas)] shadow-sm shrink-0"
            >
              {currentUser?.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt="Avatar"
                  className="w-full h-full object-cover transition-all"
                />
              ) : (
                <span className="text-[10px] lg:text-xs font-black text-[var(--text-muted)]">{currentUser?.name?.substring(0, 2).toUpperCase() || 'US'}</span>
              )}
            </button>

            {showUserMenu && (
              <div className="absolute top-full right-0 mt-3 w-56 bg-[var(--bg-panel)] rounded-2xl shadow-2xl border border-[var(--border-subtle)] overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                <div className="p-4 bg-[var(--bg-canvas)] border-b border-[var(--border-subtle)]">
                  <p className="text-sm font-black text-[var(--text-main)] truncate">{currentUser?.name}</p>
                  <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider mt-0.5">
                    {currentUser?.role === 'admin' ? 'Administrador' : currentUser?.role === 'manager' ? 'Gerente' : 'Funcionário'}
                  </p>
                </div>
                <div className="p-2 space-y-1">
                  <button
                    onClick={() => {
                      setShowPasswordModal(true);
                      setShowUserMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-[var(--text-main)] hover:bg-[var(--bg-canvas)] rounded-xl transition-all"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Configurações da Conta</span>
                  </button>
                  <button
                    onClick={() => {
                      logout();
                      setShowUserMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sair do Sistema</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {(showNotifications || showUserMenu || isSearching) && (
        <div className="fixed inset-0 z-[45] bg-black/5" onClick={() => {
          setShowNotifications(false);
          setShowUserMenu(false);
          setIsSearching(false);
        }} />
      )}
      <AccountSettingsModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onSuccess={(msg) => {
          addNotification(msg, 'success');
        }}
      />
    </header>
  );
}
