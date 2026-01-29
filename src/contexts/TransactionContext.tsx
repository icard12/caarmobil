import { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { api, socket } from '../lib/api';
import { useTeam } from './TeamContext';
import { useNotifications } from './NotificationContext';

export interface Transaction {
    id: string;
    type: 'income' | 'expense';
    amount: number;
    description: string;
    clientName?: string;
    category: string;
    status: 'paid' | 'pending' | 'overdue';
    dueDate: string;
    paymentMethod?: string;
    date: string;
}

export interface PermissionRequest {
    id: string;
    userId: string;
    user: { name: string; role: string };
    type: 'CREATE_PRODUCT' | 'UPDATE_PRODUCT' | 'DELETE_PRODUCT' | 'CREATE_SERVICE' | 'UPDATE_SERVICE' | 'DELETE_SERVICE' | 'UPDATE_SERVICE_STATUS';
    details: string;
    targetId?: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string;
}

interface TransactionContextType {
    transactions: Transaction[];
    stats: any;
    products: any[];
    analyticsSummary: any;
    pendingRequests: PermissionRequest[];
    loading: boolean;
    refreshData: () => Promise<void>;
    addTransaction: (transaction: Omit<Transaction, 'id' | 'date'>) => Promise<void>;
    updatePermissionRequestStatus: (id: string, status: 'approved' | 'rejected') => Promise<void>;
    recentTransactions: Transaction[];
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

export function TransactionProvider({ children }: { children: ReactNode }) {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [products, setProducts] = useState<any[]>([]);
    const [analyticsSummary, setAnalyticsSummary] = useState<any>(null);
    const [pendingRequests, setPendingRequests] = useState<PermissionRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const { currentUser } = useTeam();
    const { addNotification } = useNotifications();

    useEffect(() => {
        refreshData();

        // Socket.io Real-time listener for data updates
        const handleUpdate = (data: any) => {
            console.log(`[Real-time] Received update for ${data.type}:`, data.action);
            refreshData();
        };

        // Real-time listener for permission results
        const handlePermissionResult = (request: PermissionRequest) => {
            // If I am the person who requested this, notify me
            if (currentUser && request.userId === currentUser.id) {
                const isApproved = request.status === 'approved';

                const labels: Record<string, string> = {
                    'CREATE_PRODUCT': 'criação de produto',
                    'UPDATE_PRODUCT': 'edição de produto',
                    'DELETE_PRODUCT': 'exclusão de produto',
                    'CREATE_SERVICE': 'criação de serviço',
                    'UPDATE_SERVICE': 'edição de serviço',
                    'DELETE_SERVICE': 'exclusão de serviço',
                    'UPDATE_SERVICE_STATUS': 'alteração de status'
                };

                const actionLabel = labels[request.type] || 'solicitação';

                if (isApproved) {
                    addNotification(`Sua ${actionLabel} foi APROVADA pelo administrador com sucesso!`, 'success');
                } else {
                    addNotification(`Sua ${actionLabel} foi REJEITADA pelo administrador.`, 'error');
                }
            }
            refreshData();
        };

        socket.on('data-updated', handleUpdate);
        socket.on('permission-request-updated', handlePermissionResult);

        // Background interval for polling (fallback)
        const interval = setInterval(refreshData, 60000);

        return () => {
            clearInterval(interval);
            socket.off('data-updated', handleUpdate);
            socket.off('permission-request-updated', handlePermissionResult);
        };
    }, [currentUser, addNotification]);

    const refreshData = async () => {
        try {
            const [transData, statsData, productsData, summaryData, requestsData] = await Promise.all([
                api.transactions.list(),
                api.stats.get(),
                api.analytics.getProducts(),
                api.analytics.getSummary(),
                api.permissionRequests.list()
            ]);

            setTransactions(Array.isArray(transData) ? transData : []);
            setStats(statsData);
            setProducts(Array.isArray(productsData) ? productsData : []);
            setAnalyticsSummary(summaryData);
            setPendingRequests(Array.isArray(requestsData) ? requestsData.filter((r: any) => r.status === 'pending') : []);
        } catch (error) {
            console.error('Error refreshing system data:', error);
        } finally {
            setLoading(false);
        }
    };

    const addTransaction = async (data: Omit<Transaction, 'id' | 'date'>) => {
        try {
            const newTransaction = await api.transactions.create(data);
            setTransactions((prev) => [newTransaction, ...(Array.isArray(prev) ? prev : [])]);
            // Refresh stats in background after a transaction
            refreshData();
        } catch (error) {
            console.error('Error adding transaction:', error);
        }
    };

    const updatePermissionRequestStatus = async (id: string, status: 'approved' | 'rejected') => {
        // Optimistic update: Remove from list immediately
        setPendingRequests(prev => prev.filter(r => r.id !== id));

        try {
            await api.permissionRequests.update(id, status);
            // Global refresh to sync all other data affected by the approval
            await refreshData();
        } catch (error) {
            console.error('Error updating permission status:', error);
            // Revert if failed (optional, but good practice)
            const requestsData = await api.permissionRequests.list();
            setPendingRequests(Array.isArray(requestsData) ? requestsData.filter((r: any) => r.status === 'pending') : []);
        }
    };

    const recentTransactions = useMemo(() =>
        Array.isArray(transactions) ? transactions.slice(0, 10) : [],
        [transactions]);

    return (
        <TransactionContext.Provider value={{
            transactions,
            stats,
            products,
            analyticsSummary,
            pendingRequests,
            loading,
            refreshData,
            addTransaction,
            updatePermissionRequestStatus,
            recentTransactions
        }}>
            {children}
        </TransactionContext.Provider>
    );
}

export function useTransactions() {
    const context = useContext(TransactionContext);
    if (context === undefined) {
        throw new Error('useTransactions must be used within a TransactionProvider');
    }
    return context;
}
