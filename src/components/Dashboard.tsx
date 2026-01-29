import { ChevronRight, ShoppingBag, Terminal, DollarSign, History, TrendingUp, TrendingDown, AlertTriangle, Check, X, Clock } from 'lucide-react';
import logo from '../assets/logo.png';
import DataTable, { TableColumn } from './dashboard/DataTable';
import { Product } from '../lib/supabase';
import { useNotifications } from '../contexts/NotificationContext';
import { useTransactions } from '../contexts/TransactionContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTeam } from '../contexts/TeamContext';
import ProductBadge from './ui/ProductBadge';
import InventorySummary from './dashboard/InventorySummary';
import { motion } from 'framer-motion';
import { api } from '../lib/api';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

interface ProductAnalytics extends Product {
  totalSales: number;
  salesVelocity: number;
  daysSinceLastMovement: number;
  status: 'best-seller' | 'low-sales' | 'no-movement' | 'stagnant' | 'normal';
  badge?: {
    type: 'best-seller' | 'low-sales' | 'no-movement' | 'stagnant';
    label: string;
    color: string;
  };
}

interface DashboardProps {
  searchQuery?: string;
}

export default function Dashboard({ searchQuery = '' }: DashboardProps) {
  const {
    stats,
    products,
    analyticsSummary,
    pendingRequests,
    loading,
    recentTransactions,
    refreshData,
    updatePermissionRequestStatus
  } = useTransactions();
  const { addNotification } = useNotifications();
  const { t, locale, smartTranslate } = useLanguage();
  const { currentUser } = useTeam();
  const isAdmin = currentUser?.role === 'admin';


  const handleBulkDelete = async (ids: string[]) => {
    if (!confirm(t('deleteConfirm').replace('{count}', ids.length.toString()))) return;

    if (!isAdmin) {
      try {
        for (const id of ids) {
          await api.permissionRequests.create({
            type: 'DELETE_PRODUCT',
            details: JSON.stringify({ id }),
            targetId: id
          });
        }
        addNotification(t('requestSent') || 'Solicitação enviada ao administrador', 'info');
        return;
      } catch (error) {
        addNotification(t('errorSendingRequest') || 'Erro ao enviar solicitação', 'error');
        return;
      }
    }

    try {
      await api.products.delete(ids);
      addNotification(t('itemsRemoved').replace('{count}', ids.length.toString()), 'success');
      await refreshData();
    } catch (error) {
      console.error('Error deleting products:', error);
      addNotification(t('errorRemovingItems'), 'error');
    }
  };

  const handleApproveRequest = async (id: string) => {
    try {
      await updatePermissionRequestStatus(id, 'approved');
      addNotification(t('requestApproved') || 'Solicitação aprovada!', 'success');
    } catch (error) {
      addNotification(t('errorApproving') || 'Erro ao aprovar solicitação', 'error');
    }
  };

  const handleRejectRequest = async (id: string) => {
    try {
      await updatePermissionRequestStatus(id, 'rejected');
      addNotification(t('requestRejected') || 'Solicitação rejeitada', 'info');
    } catch (error) {
      addNotification(t('errorRejecting') || 'Erro ao rejeitar solicitação', 'error');
    }
  };


  const filteredProducts = products.filter(p =>
    (p.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (p.category?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (p.id?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  const inventoryColumns: TableColumn[] = [
    {
      header: t('image'),
      accessor: 'image_url',
      render: (url: string) => (
        <div className="w-10 h-8 rounded bg-slate-100 border border-slate-200 overflow-hidden">
          <img src={url || logo} alt="Produto" className="w-full h-full object-cover grayscale" />
        </div>
      )
    },
    {
      header: t('title'),
      accessor: 'name',
      render: (name: string, row: ProductAnalytics) => (
        <div className="max-w-[250px]">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-[13px] font-bold text-[#FF4700] leading-snug group-hover:underline cursor-pointer truncate">{name}</p>
            {row.status !== 'normal' && <ProductBadge type={row.status} />}
          </div>
          <p className="text-[10px] text-slate-400 truncate">{row.category?.split(' ')[0]}</p>
        </div>
      )
    },
    {
      header: t('qty'),
      accessor: 'stock',
      render: (stock: number) => <span className="text-[13px] font-bold text-slate-700">{stock} un</span>
    },
    {
      header: t('price'),
      accessor: 'price',
      render: (price: number) => <span className="text-[13px] font-bold text-slate-800">MT {price.toLocaleString(locale, { minimumFractionDigits: 2 })}</span>
    },
    {
      header: t('status'),
      accessor: 'status',
      render: (status: string) => {
        const labels: any = { active: t('available'), out_of_stock: t('soldOut'), pending: t('pending') };
        const colors: any = { active: 'text-green-600', out_of_stock: 'text-red-500', pending: 'text-amber-500' };
        return <span className={`text-[10px] font-black uppercase tracking-widest ${colors[status] || 'text-slate-400'}`}>{labels[status] || status}</span>
      }
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#FF4700]/20 border-t-[#FF4700] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-10 pb-10">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
        <div className="flex items-center gap-3 lg:gap-5">
          <div className="p-2 lg:p-3 bg-slate-900 rounded-xl lg:rounded-2xl shadow-lg shrink-0 lg:animate-float">
            <Terminal className="w-4 h-4 lg:w-6 lg:h-6 text-[#FF4700]" />
          </div>
          <div className="space-y-0.5 lg:space-y-1 overflow-hidden">
            <h1 className="text-xl lg:text-4xl font-black text-[var(--text-main)] tracking-tighter truncate leading-tight uppercase italic">{t('commandCenter')}</h1>
            <p className="text-[8px] lg:text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.1em] lg:tracking-[0.3em]">{t('operationalManagement')}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 lg:gap-4 overflow-x-auto hide-scrollbar pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
          <button className="flex items-center gap-2 px-4 lg:px-7 py-2.5 lg:py-4 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl lg:rounded-2xl text-[11px] lg:text-[13px] font-extrabold text-[var(--text-muted)] hover:bg-[var(--bg-canvas)] transition-all group active:scale-95 shadow-sm lg:shadow-pro whitespace-nowrap">
            {t('quickAction')} <ChevronRight className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-[#FF4700]" />
          </button>
          <button className="flex items-center gap-2 px-4 lg:px-7 py-2.5 lg:py-4 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl lg:rounded-2xl text-[11px] lg:text-[13px] font-extrabold text-[var(--text-muted)] hover:bg-[var(--bg-canvas)] transition-all group active:scale-95 shadow-sm lg:shadow-pro whitespace-nowrap">
            <ShoppingBag className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-[#FF4700]" /> {t('marketplace')}
          </button>
        </div>
      </div>

      {isAdmin && pendingRequests.length > 0 && (
        <div className="bg-[#16222A]/95 backdrop-blur-md border border-[#FF4700]/30 rounded-3xl p-6 mb-8 animate-slide-up shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF4700]/5 rounded-full blur-3xl pointer-events-none -mr-32 -mt-32 group-hover:bg-[#FF4700]/10 transition-all duration-700" />

          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="p-2.5 bg-[#FF4700] rounded-xl text-white shadow-glow-orange animate-pulse">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight">{t('pendingDecisions') || 'Centro de Decisões'} ({pendingRequests.length})</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('waitingYourAction') || 'Aguardando sua autorização estratégica'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 relative z-10">
            {pendingRequests.map(req => {
              const details = typeof req.details === 'string' ? JSON.parse(req.details) : req.details;
              return (
                <div key={req.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between hover:border-[#FF4700]/30 transition-all group/card">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${req.type === 'CREATE_PRODUCT' ? 'bg-emerald-500/20 text-emerald-400' :
                        req.type === 'DELETE_PRODUCT' ? 'bg-rose-500/20 text-rose-400' : 'bg-blue-500/20 text-blue-400'
                        }`}>
                        {req.type === 'CREATE_PRODUCT' ? t('newProduct') : req.type === 'UPDATE_PRODUCT' ? t('edit') : t('delete')}
                      </span>
                      <span className="text-[9px] font-bold text-slate-500">{new Date(req.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm font-black text-white mb-1 truncate">{details.name || details.description || (req.targetId ? `ID: ${req.targetId.split('-')[0]}` : '---')}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                      {t('requester') || 'SOLICITANTE'}: <span className="text-[#FF4700]">{req.user?.name || '---'}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 mt-5">
                    <button
                      onClick={() => handleApproveRequest(req.id)}
                      className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-1 shadow-lg shadow-emerald-500/20"
                    >
                      <Check className="w-3 h-3" /> {t('approve') || 'Aprovar'}
                    </button>
                    <button
                      onClick={() => handleRejectRequest(req.id)}
                      className="flex-1 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-1"
                    >
                      <X className="w-3 h-3" /> {t('reject') || 'Rejeitar'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {stats && stats.lowStockProducts > 0 && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="bg-orange-50 border border-orange-200 rounded-2xl lg:rounded-3xl p-4 lg:p-6 flex items-center justify-between gap-4 overflow-hidden"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 lg:w-6 lg:h-6 text-orange-600" />
            </div>
            <div>
              <h3 className="text-sm lg:text-lg font-black text-orange-900 leading-tight">{t('stockWarning')}</h3>
              <p className="text-[10px] lg:text-sm font-bold text-orange-700/70 uppercase tracking-tight">{t('lowStockMsg').replace('{count}', stats.lowStockProducts.toString())}</p>
            </div>
          </div>
          <button
            onClick={() => window.location.hash = '#products'} // Assuming Hash Router or similar, or just navigate
            className="px-4 lg:px-6 py-2 lg:py-3 bg-orange-600 text-white text-[10px] lg:text-xs font-black rounded-lg lg:rounded-xl shadow-lg hover:bg-orange-700 transition-all uppercase whitespace-nowrap"
          >
            {t('restockNow')}
          </button>
        </motion.div>
      )}

      {stats && (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 lg:gap-6"
        >
          {/* (+) Receitas */}
          <motion.div
            variants={item}
            className="bg-[var(--bg-panel)] p-3.5 lg:p-7 rounded-2xl lg:rounded-[32px] border border-[var(--border-subtle)] shadow-sm relative overflow-hidden group hover:border-green-200 transition-all duration-500"
          >
            <div className="flex items-center justify-between mb-2 lg:mb-5">
              <span className="text-[8px] lg:text-[10px] font-black text-green-600 border border-green-100 bg-green-50 px-1.5 lg:px-2.5 py-0.5 lg:py-1 rounded-md lg:rounded-lg uppercase tracking-tight lg:tracking-widest leading-none shrink-0">(+) {t('revenue')}</span>
              <div className="w-6 h-6 lg:w-9 lg:h-9 rounded-lg lg:rounded-xl bg-green-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <TrendingUp className="w-3.5 h-3.5 lg:w-5 lg:h-5 text-green-600" />
              </div>
            </div>
            <p className="text-base lg:text-3xl font-black text-[var(--text-main)] tracking-tighter">MT {stats.totalIncome.toLocaleString(locale, { minimumFractionDigits: 2 })}</p>

            <div className="mt-2 lg:mt-5 pt-2 lg:pt-5 border-t border-slate-50 flex gap-2 lg:gap-4 overflow-hidden">
              <div className="space-y-0.5 min-w-0">
                <p className="text-[7px] font-bold text-[var(--text-muted)] uppercase truncate">{t('store')}</p>
                <p className="text-[9px] lg:text-[11px] font-black text-[var(--text-main)] truncate">MT {Math.round(stats.productRevenue || 0).toLocaleString(locale)}</p>
              </div>
              <div className="w-[1px] h-4 lg:h-6 bg-[var(--border-subtle)] self-center shrink-0" />
              <div className="space-y-0.5 min-w-0">
                <p className="text-[7px] font-bold text-[var(--text-muted)] uppercase truncate">{t('servs')}</p>
                <p className="text-[9px] lg:text-[11px] font-black text-[var(--text-main)] truncate">MT {Math.round(stats.serviceRevenue || 0).toLocaleString(locale)}</p>
              </div>
            </div>
          </motion.div>

          {/* (-) Despesas */}
          <motion.div
            variants={item}
            className="bg-[var(--bg-panel)] p-3.5 lg:p-7 rounded-2xl lg:rounded-[32px] border border-[var(--border-subtle)] shadow-sm relative overflow-hidden group hover:border-red-200 transition-all duration-500"
          >
            <div className="flex items-center justify-between mb-2 lg:mb-5">
              <span className="text-[8px] lg:text-[10px] font-black text-red-500 border border-red-100 bg-red-50 px-1.5 lg:px-2.5 py-0.5 lg:py-1 rounded-md lg:rounded-lg uppercase tracking-tight lg:tracking-widest leading-none shrink-0">(-) {t('expenses')}</span>
              <div className="w-6 h-6 lg:w-9 lg:h-9 rounded-lg lg:rounded-xl bg-red-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <TrendingDown className="w-3.5 h-3.5 lg:w-5 lg:h-5 text-red-500" />
              </div>
            </div>
            <p className="text-base lg:text-3xl font-black text-[var(--text-main)] tracking-tighter">MT {stats.totalExpenses.toLocaleString(locale, { minimumFractionDigits: 2 })}</p>
            <p className="text-[8px] lg:text-[10px] font-bold text-[var(--text-muted)] mt-1.5 uppercase tracking-tight truncate">{t('totalInvested')}</p>
          </motion.div>

          {/* (=) Lucro Líquido */}
          <motion.div
            variants={item}
            className="bg-slate-900 p-3.5 lg:p-7 rounded-2xl lg:rounded-[32px] shadow-lg lg:shadow-2xl relative overflow-hidden group active:scale-[0.98] transition-all duration-500"
          >
            <div className="absolute top-0 right-0 w-24 lg:w-32 h-24 lg:h-32 bg-[#FF4700] rounded-full blur-[40px] lg:blur-[80px] opacity-20 lg:opacity-25 -mr-12 lg:-mr-16 -mt-12 lg:-mt-16 group-hover:opacity-40 transition-opacity" />
            <div className="flex items-center justify-between mb-2 lg:mb-3 relative z-10">
              <span className="text-[8px] lg:text-[10px] font-black text-[#FF4700] border border-[#FF4700]/20 bg-[#FF4700]/10 px-1.5 lg:px-2.5 py-0.5 lg:py-1 rounded-md lg:rounded-lg uppercase tracking-tight lg:tracking-widest leading-none shrink-0">(=) {t('netProfit')}</span>
              <div className="w-6 h-6 lg:w-9 lg:h-9 rounded-lg lg:rounded-xl bg-white/5 flex items-center justify-center group-hover:rotate-12 transition-transform">
                <DollarSign className="w-3.5 h-3.5 lg:w-5 lg:h-5 text-white" />
              </div>
            </div>
            <p className="text-base lg:text-3xl font-black text-white tracking-tighter relative z-10">MT {stats.netProfit.toLocaleString(locale, { minimumFractionDigits: 2 })}</p>
            <div className="flex items-center gap-1.5 lg:gap-2 mt-1 lg:mt-2 relative z-10">
              <div className={`w-1 lg:w-2 h-1 lg:h-2 rounded-full ${stats.netProfit >= 0 ? 'bg-green-500 lg:shadow-glow-green animate-pulse' : 'bg-red-500 lg:shadow-glow-red animate-pulse'}`} />
              <p className="text-[7px] lg:text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stats.netProfit >= 0 ? t('positive') : t('negative')}</p>
            </div>
          </motion.div>

          {/* (Asset) Valor de Estoque */}
          <motion.div
            variants={item}
            className="bg-[var(--bg-panel)] p-3.5 lg:p-7 rounded-2xl lg:rounded-[32px] border border-[var(--border-subtle)] shadow-sm relative overflow-hidden group hover:border-blue-200 transition-all duration-500"
          >
            <div className="flex items-center justify-between mb-2 lg:mb-5">
              <span className="text-[8px] lg:text-[10px] font-black text-blue-600 border border-blue-100 bg-blue-50 px-1.5 lg:px-2.5 py-0.5 lg:py-1 rounded-md lg:rounded-lg uppercase tracking-tight lg:tracking-widest leading-none shrink-0">{t('inventory')}</span>
              <div className="w-6 h-6 lg:w-9 lg:h-9 rounded-lg lg:rounded-xl bg-blue-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ShoppingBag className="w-3.5 h-3.5 lg:w-5 lg:h-5 text-blue-600" />
              </div>
            </div>
            <p className="text-base lg:text-3xl font-black text-[var(--text-main)] tracking-tighter">MT {stats.inventoryValue.toLocaleString(locale, { minimumFractionDigits: 2 })}</p>
            <p className="text-[8px] lg:text-[10px] font-bold text-[var(--text-muted)] mt-1.5 uppercase tracking-tight truncate">{stats.totalProducts} {t('items').toUpperCase()}</p>
          </motion.div>
        </motion.div>
      )}


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="lg:col-span-2 relative animate-in fade-in zoom-in-95 duration-700 delay-200 overflow-hidden">
          <DataTable
            title={t('generalInventory')}
            columns={inventoryColumns}
            data={filteredProducts}
            onDeleteSelected={handleBulkDelete}
          />
        </div>

        <div className="space-y-6 lg:space-y-8 h-fit">
          <InventorySummary summary={analyticsSummary} />

          <div className="bg-[var(--bg-panel)] rounded-2xl lg:rounded-[32px] border border-[var(--border-subtle)] p-4 lg:p-8 animate-in fade-in zoom-in-95 duration-700 delay-300">
            <div className="flex items-center justify-between mb-4 lg:mb-8">
              <div className="flex items-center gap-2 lg:gap-3">
                <div className="p-1.5 lg:p-2 bg-[var(--bg-canvas)] rounded-lg lg:rounded-xl">
                  <History className="w-4 h-4 lg:w-5 lg:h-5 text-[var(--text-muted)]" />
                </div>
                <div>
                  <h3 className="text-xs lg:text-lg font-black text-[var(--text-main)] tracking-tight">{t('activities')}</h3>
                  <p className="text-[8px] lg:text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{t('realTime')}</p>
                </div>
              </div>
              <button className="text-[9px] lg:text-xs font-bold text-[#FF4700] hover:underline uppercase tracking-wider">{t('viewAll')}</button>
            </div>

            <div className="space-y-3.5 lg:space-y-6 relative">
              <div className="absolute left-[13px] lg:left-[19px] top-4 bottom-4 w-0.5 bg-[var(--bg-canvas)]" />

              {recentTransactions.map((transaction) => (
                <div key={transaction.id} className="relative flex items-center gap-3 lg:gap-4 group">
                  <div className={`relative z-10 w-7 h-7 lg:w-10 lg:h-10 rounded-lg lg:rounded-xl flex items-center justify-center border-2 border-white shadow-sm transition-transform group-hover:scale-110 shrink-0 ${transaction.type === 'income'
                    ? 'bg-green-100 text-green-600'
                    : 'bg-red-100 text-red-500'
                    }`}>
                    {transaction.type === 'income' ? <TrendingUp className="w-3 lg:w-5 h-3 lg:h-5" /> : <TrendingDown className="w-3 lg:w-5 h-3 lg:h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0 sm:mb-0.5">
                      <h4 className="text-[10px] lg:text-sm font-bold text-[var(--text-main)] truncate pr-2">{smartTranslate(transaction.description)}</h4>
                      <span className={`text-[10px] lg:text-sm font-black whitespace-nowrap shrink-0 ${transaction.type === 'income' ? 'text-green-600' : 'text-red-500'
                        }`}>
                        {transaction.type === 'income' ? '+' : '-'} MT {transaction.amount.toLocaleString(locale, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <p className="text-[8px] lg:text-[11px] font-bold text-[var(--text-muted)] leading-none">
                      {new Date(transaction.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}

              {recentTransactions.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-[11px] lg:text-sm font-medium">
                  {t('noRecentOps')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
