import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useNotifications } from './NotificationContext';
import { api } from '../lib/api';

export interface User {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'manager' | 'employee';
    password?: string;
    avatar?: string;
    isActive: boolean;
    isDeleted: boolean;
    createdAt: string;
}

interface TeamContextType {
    users: User[];
    addUser: (user: Omit<User, 'id' | 'createdAt' | 'isActive' | 'isDeleted'>) => Promise<void>;
    removeUser: (id: string) => Promise<void>;
    updateUser: (id: string, user: Partial<User>) => Promise<void>;
    currentUser: User | null;
    setCurrentUser: (user: User | null) => void;
    logout: () => void;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export function TeamProvider({ children }: { children: ReactNode }) {
    const [users, setUsers] = useState<User[]>([]);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const { addNotification } = useNotifications();

    useEffect(() => {
        const savedUser = sessionStorage.getItem('currentUser');
        if (savedUser) {
            setCurrentUser(JSON.parse(savedUser));
        }
        fetchUsers();
    }, []);

    const handleSetCurrentUser = (user: User | null) => {
        setCurrentUser(user);
        if (user) {
            sessionStorage.setItem('currentUser', JSON.stringify(user));
        } else {
            sessionStorage.removeItem('currentUser');
        }
    };

    const logout = () => {
        handleSetCurrentUser(null);
        addNotification('Sessão encerrada', 'info');
    };

    const fetchUsers = async (retries = 3) => {
        try {
            const data = await api.users.list();
            setUsers(data);

            // Sync current user with latest data from server
            if (currentUser) {
                const refreshedMe = data.find((u: User) => u.id === currentUser.id);
                if (refreshedMe) {
                    if (JSON.stringify(refreshedMe) !== JSON.stringify(currentUser)) {
                        handleSetCurrentUser(refreshedMe);
                    }
                }
            }
        } catch (error) {
            if (retries > 0) {
                console.log(`Retrying fetch users... (${3 - retries + 1})`);
                setTimeout(() => fetchUsers(retries - 1), 2000);
            } else {
                console.error('Error fetching users:', error);
                addNotification('Não foi possível conectar ao servidor. Verifique se o sistema foi iniciado.', 'error');
            }
        }
    };

    const addUser = async (userData: Omit<User, 'id' | 'createdAt' | 'isActive' | 'isDeleted'>) => {
        try {
            const newUser = await api.users.create(userData); // Assuming an api.users.create method
            setUsers((prev) => [newUser, ...prev]);
            addNotification(`Usuário ${newUser.name} adicionado ao sistema`, 'success');
        } catch (error) {
            console.error('Error adding user:', error);
            const msg = error instanceof Error ? error.message : 'Erro ao adicionar usuário';
            addNotification(msg, 'error');
        }
    };

    const removeUser = async (id: string) => {
        try {
            const user = users.find(u => u.id === id);
            await api.users.remove(id); // Assuming an api.users.remove method
            setUsers((prev) => prev.filter((u) => u.id !== id));
            if (user) {
                addNotification(`Usuário ${user.name} removido do sistema`, 'warning');
            }
        } catch (error) {
            console.error('Error removing user:', error);
            const msg = error instanceof Error ? error.message : 'Erro ao remover usuário';
            addNotification(msg, 'error');
        }
    };

    const updateUser = async (id: string, updateData: Partial<User>) => {
        try {
            const updatedUser = await api.users.update(id, updateData);

            setUsers((prev) => prev.map(u => u.id === id ? updatedUser : u));
            if (currentUser?.id === id) {
                handleSetCurrentUser(updatedUser);
            }
            addNotification(`Usuário atualizado com sucesso`, 'success');
        } catch (error) {
            console.error('Update error:', error);
            const msg = error instanceof Error ? error.message : 'Erro ao atualizar usuário';
            addNotification(msg, 'error');
            throw error;
        }
    };

    return (
        <TeamContext.Provider value={{
            users,
            addUser,
            removeUser,
            updateUser,
            currentUser,
            setCurrentUser: handleSetCurrentUser,
            logout
        }}>
            {children}
        </TeamContext.Provider>
    );
}

export function useTeam() {
    const context = useContext(TeamContext);
    if (context === undefined) {
        throw new Error('useTeam must be used within a TeamProvider');
    }
    return context;
}
