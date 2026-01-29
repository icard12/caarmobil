import { io } from 'socket.io-client';

const isElectron = window.location.protocol === 'file:' || /Electron/.test(navigator.userAgent);
const API_URL = isElectron ? 'http://localhost:3000/api' : '/api';
const SOCKET_URL = isElectron ? 'http://localhost:3000' : window.location.origin;

export const socket = io(SOCKET_URL);
const getAuthHeaders = (extra = {}) => {
    const savedUser = sessionStorage.getItem('currentUser');
    const user = savedUser ? JSON.parse(savedUser) : null;
    return {
        'Content-Type': 'application/json',
        'x-user-id': user?.id || '',
        ...extra
    };
};

export const api = {
    products: {
        list: async () => {
            const res = await fetch(`${API_URL}/products`);
            if (!res.ok) throw new Error(`Erro ao buscar produtos (${res.status})`);
            const data = await res.json();
            return Array.isArray(data) ? data : [];
        },
        create: async (data: any) => {
            const res = await fetch(`${API_URL}/products`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(data),
            });
            return res.json();
        },
        update: async (id: string, data: any) => {
            const res = await fetch(`${API_URL}/products/${id}`, {
                method: 'PATCH',
                headers: getAuthHeaders(),
                body: JSON.stringify(data),
            });
            return res.json();
        },
        adjustStock: async (data: { productId: string, userId: string, type: 'entry' | 'exit', quantity: number, reason?: string, isFinancial?: boolean }) => {
            const res = await fetch(`${API_URL}/products/adjust-stock`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(data),
            });
            return res.json();
        },
        delete: async (ids: string[]) => {
            const res = await fetch(`${API_URL}/products`, {
                method: 'DELETE',
                headers: getAuthHeaders(),
                body: JSON.stringify({ ids }),
            });
            return res.json();
        }
    },
    stockMovements: {
        list: async () => {
            const res = await fetch(`${API_URL}/stock-movements`);
            if (!res.ok) throw new Error(`Erro ao buscar histórico (${res.status})`);
            const data = await res.json();
            return Array.isArray(data) ? data : [];
        }
    },
    transactions: {
        list: async () => {
            const res = await fetch(`${API_URL}/transactions`);
            if (!res.ok) throw new Error(`Erro ao buscar transações (${res.status})`);
            const data = await res.json();
            return Array.isArray(data) ? data : [];
        },
        create: async (data: any) => {
            const res = await fetch(`${API_URL}/transactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return res.json();
        },
        delete: async (id: string) => {
            const res = await fetch(`${API_URL}/transactions/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            if (!res.ok) throw new Error('Erro ao deletar transação');
            return res.json();
        }
    },
    services: {
        list: async () => {
            const res = await fetch(`${API_URL}/services`);
            if (!res.ok) throw new Error(`Erro ao buscar serviços (${res.status})`);
            const data = await res.json();
            return Array.isArray(data) ? data : [];
        },
        create: async (data: any) => {
            const res = await fetch(`${API_URL}/services`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(data)
            });
            return res.json();
        },
        update: async (id: string, data: any) => {
            const res = await fetch(`${API_URL}/services/${id}`, {
                method: 'PATCH',
                headers: getAuthHeaders(),
                body: JSON.stringify(data)
            });
            return res.json();
        },
        delete: async (id: string) => {
            const res = await fetch(`${API_URL}/services/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Erro ao excluir serviço');
            }
            return res.json();
        }
    },
    stats: {
        get: async () => {
            const res = await fetch(`${API_URL}/stats`);
            if (!res.ok) throw new Error(`Erro ao buscar estatísticas (${res.status})`);
            return res.json();
        }
    },
    logs: {
        list: async () => {
            const res = await fetch(`${API_URL}/logs`);
            if (!res.ok) throw new Error(`Erro ao buscar logs (${res.status})`);
            const data = await res.json();
            return Array.isArray(data) ? data : [];
        }
    },
    users: {
        list: async () => {
            const res = await fetch(`${API_URL}/users`, {
                headers: getAuthHeaders()
            });
            if (!res.ok) throw new Error(`Erro ao buscar usuários (${res.status})`);
            return res.json();
        },
        update: async (id: string, data: any) => {
            const res = await fetch(`${API_URL}/users/${id}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(data)
            });

            const contentType = res.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const result = await res.json();
                if (!res.ok) throw new Error(result.error || 'Erro ao atualizar usuário');
                return result;
            } else {
                throw new Error(`Erro no servidor (Status ${res.status}). Verifique o console backend.`);
            }
        },
        create: async (data: any) => {
            const res = await fetch(`${API_URL}/users`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(data)
            });
            const contentType = res.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const result = await res.json();
                if (!res.ok) throw new Error(result.error || 'Erro ao criar usuário');
                return result;
            } else {
                const text = await res.text();
                throw new Error(`Erro ao criar usuário (Status ${res.status}): ${text.substring(0, 100)}`);
            }
        },
        remove: async (id: string) => {
            const res = await fetch(`${API_URL}/users/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            const contentType = res.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const result = await res.json();
                if (!res.ok) throw new Error(result.error || 'Erro ao remover usuário');
                return result;
            } else {
                const text = await res.text();
                throw new Error(`Erro ao remover usuário (Status ${res.status}): ${text.substring(0, 100)}`);
            }
        },
        updateAccount: async (data: { currentPassword: string, newEmail?: string, newPassword?: string }) => {
            const res = await fetch(`${API_URL}/users/update-account`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(data)
            });
            const contentType = res.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const result = await res.json();
                if (!res.ok) throw new Error(result.error || 'Erro ao atualizar conta');
                return result;
            } else {
                const text = await res.text();
                throw new Error(`Erro ao atualizar conta (Status ${res.status}): ${text.substring(0, 100)}`);
            }
        }
    },
    upload: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            body: formData
        });
        return res.json();
    },
    analytics: {
        getProducts: async () => {
            const res = await fetch(`${API_URL}/analytics/products`);
            if (!res.ok) throw new Error(`Erro ao buscar produtos analíticos (${res.status})`);
            return res.json();
        },
        getSummary: async () => {
            const res = await fetch(`${API_URL}/analytics/summary`);
            if (!res.ok) throw new Error(`Erro ao buscar resumo analítico (${res.status})`);
            return res.json();
        }
    },
    admin: {
        resetSystem: async () => {
            const res = await fetch(`${API_URL}/admin/reset`, {
                method: 'POST',
                headers: getAuthHeaders()
            });
            if (!res.ok) throw new Error('Erro ao restaurar sistema');
            return res.json();
        },
        getBackup: async () => {
            const res = await fetch(`${API_URL}/admin/backup`, {
                headers: getAuthHeaders()
            });
            if (!res.ok) throw new Error('Erro ao gerar backup');
            return res.json();
        },
        restoreSystem: async (data: any) => {
            const res = await fetch(`${API_URL}/admin/restore`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ data })
            });
            if (!res.ok) throw new Error('Erro ao restaurar sistema');
            return res.json();
        }
    },
    pettyCash: {
        list: async () => {
            const res = await fetch(`${API_URL}/petty-cash`);
            if (!res.ok) throw new Error(`Erro ao buscar caixa interno (${res.status})`);
            const data = await res.json();
            return Array.isArray(data) ? data : [];
        },
        create: async (data: { type: 'deposit' | 'expense', amount: number, description: string }) => {
            const res = await fetch(`${API_URL}/petty-cash`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(data)
            });
            return res.json();
        }
    },
    permissionRequests: {
        list: async () => {
            const res = await fetch(`${API_URL}/permission-requests`, {
                headers: getAuthHeaders()
            });
            if (!res.ok) throw new Error(`Erro ao buscar solicitações (${res.status})`);
            return res.json();
        },
        create: async (data: { type: string, details: any, targetId?: string }) => {
            const res = await fetch(`${API_URL}/permission-requests`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error(`Erro ao criar solicitação (${res.status})`);
            return res.json();
        },
        update: async (id: string, status: 'approved' | 'rejected') => {
            const res = await fetch(`${API_URL}/permission-requests/${id}`, {
                method: 'PATCH',
                headers: getAuthHeaders(),
                body: JSON.stringify({ status })
            });
            if (!res.ok) throw new Error(`Erro ao processar solicitação (${res.status})`);
            return res.json();
        }
    }
};
