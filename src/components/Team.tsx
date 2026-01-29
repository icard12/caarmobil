import React, { useState, useRef } from 'react';
import { Shield, Plus, Mail, Edit2, Trash2, User, Camera, Loader2, Settings } from 'lucide-react';
import { AccountSettingsModal } from './AccountSettingsModal';
import { useTeam } from '../contexts/TeamContext';
import { api } from '../lib/api';
import { useNotifications } from '../contexts/NotificationContext';
import { useOnlinePresence } from '../hooks/useOnlinePresence';

export default function Team() {
    const { users, addUser, removeUser, updateUser, currentUser } = useTeam();
    const { addNotification } = useNotifications();
    const { isUserOnline } = useOnlinePresence();
    const [showForm, setShowForm] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showArchived, setShowArchived] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'employee' as 'admin' | 'manager' | 'employee',
        avatar: ''
    });

    const handleEdit = (user: any) => {
        setFormData({
            name: user.name,
            email: user.email,
            password: '', // Don't show password
            role: user.role,
            avatar: user.avatar || ''
        });
        setEditingId(user.id);
        setIsEditing(true);
        setShowForm(true);
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const data = await api.upload(file);
            if (data.url) {
                setFormData(prev => ({ ...prev, avatar: data.url }));
                addNotification('Imagem carregada com sucesso', 'success');
            } else {
                throw new Error('Falha ao obter URL da imagem');
            }
        } catch (error) {
            console.error('Upload error:', error);
            addNotification('Erro ao carregar imagem', 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Finalizando formulário...', { isEditing, editingId, formData });

        if (!formData.name || !formData.email) {
            addNotification('Nome e Email são obrigatórios', 'warning');
            return;
        }

        try {
            setUploading(true); // Re-use for save state
            if (isEditing && editingId) {
                const updateData: any = { ...formData };
                if (!updateData.password) delete updateData.password;

                await updateUser(editingId, updateData);
            } else {
                if (!formData.password) {
                    addNotification('Senha é obrigatória para novos usuários', 'warning');
                    return;
                }
                console.log('Chamando addUser...', formData);
                await addUser(formData);
            }

            console.log('Sucesso! Fechando formulário.');
            setShowForm(false);
            setIsEditing(false);
            setEditingId(null);
            setFormData({ name: '', email: '', password: '', role: 'employee', avatar: '' });
        } catch (error) {
            console.error('Erro no processamento do formulário:', error);
        } finally {
            setUploading(false);
        }
    };

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'admin': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'manager': return 'bg-blue-100 text-blue-700 border-blue-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    const getRoleLabel = (role: string) => {
        switch (role) {
            case 'admin': return 'Administrador';
            case 'manager': return 'Gerente';
            default: return 'Funcionário';
        }
    };

    const handleToggleActive = async (user: any) => {
        try {
            await updateUser(user.id, { isActive: !user.isActive });
            addNotification(user.isActive ? 'Usuário desativado' : 'Usuário ativado com sucesso', 'info');
        } catch (error) {
            console.error('Error toggling user state:', error);
        }
    };

    return (
        <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 lg:gap-8 animate-slide-up">
                <div className="flex items-center gap-4 lg:gap-5">
                    <div className="p-2 lg:p-3 bg-purple-50 rounded-2xl shadow-sm shrink-0 border border-purple-100">
                        <Shield className="w-5 h-5 lg:w-6 lg:h-6 text-purple-600" />
                    </div>
                    <div className="space-y-0.5 lg:space-y-1 overflow-hidden">
                        <div className="flex items-center gap-3">
                            <h2 className="text-xl lg:text-3xl font-black text-slate-900 tracking-tight">Equipe e Permissões</h2>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 animate-pulse">
                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span className="text-xs font-black uppercase tracking-wider">{users.filter(u => isUserOnline(u.id)).length} Online</span>
                            </span>
                        </div>
                        <p className="text-[9px] lg:text-[12px] font-black text-slate-400 uppercase tracking-widest">Gestão de acessos v2.0</p>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                    <button
                        onClick={() => setShowArchived(!showArchived)}
                        className={`flex items-center justify-center gap-2 px-6 py-3.5 lg:py-3 border-2 rounded-xl text-sm font-bold transition-all active:scale-95 ${showArchived ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'}`}
                    >
                        <Settings className="w-4 h-4" />
                        <span>{showArchived ? 'Ocultar Arquivados' : 'Ver Arquivados'}</span>
                    </button>
                    <button
                        onClick={() => {
                            setIsEditing(false);
                            setFormData({ name: '', email: '', password: '', role: 'employee', avatar: '' });
                            setShowForm(true);
                        }}
                        className="flex items-center justify-center gap-2 px-6 py-3.5 lg:py-3 bg-[#FF4700] text-white text-sm font-bold rounded-xl shadow-glow-orange hover:bg-[#E64000] transition-all active:scale-95 flex-1 sm:flex-none"
                    >
                        <Plus className="w-5 h-5" />
                        <span>Adicionar Usuário</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-6">
                {users
                    .filter(u => showArchived ? true : !u.isDeleted)
                    .map((user: any) => (
                        <div key={user.id} className={`bg-white p-4 lg:p-6 rounded-2xl lg:rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl transition-all group ${!user.isActive ? 'opacity-75 grayscale-[0.5]' : ''}`}>
                            <div className="flex justify-between items-start mb-4 lg:mb-6">
                                <div className="flex gap-3 lg:gap-4 min-w-0">
                                    <div className="relative group/avatar shrink-0">
                                        <div className="w-10 h-10 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden shadow-sm">
                                            {user.avatar ? (
                                                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover transition-transform group-hover/avatar:scale-110" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                    <User className="w-5 h-5 lg:w-6 lg:h-6" />
                                                </div>
                                            )}
                                        </div>
                                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 lg:w-4 lg:h-4 rounded-full border-2 border-white shadow-sm flex items-center justify-center ${isUserOnline(user.id) ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                                            {isUserOnline(user.id) && <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full bg-white animate-pulse" />}
                                        </div>
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-slate-900 text-[14px] lg:text-lg truncate flex items-center gap-1.5 lg:gap-2">
                                            <span className="truncate">{user.name}</span>
                                            {user.id === currentUser?.id && <span className="text-[7px] lg:text-[8px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 px-1 lg:px-1.5 py-0.5 rounded-md lg:rounded-lg border border-emerald-100 shrink-0">VOCÊ</span>}
                                        </h3>
                                        <div className="flex flex-wrap gap-1.5 mt-0.5 lg:mt-1">
                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-lg text-[8px] lg:text-[10px] font-black uppercase tracking-wider border ${getRoleBadge(user.role)}`}>
                                                {getRoleLabel(user.role)}
                                            </span>
                                            {!user.isActive && (
                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-lg text-[8px] lg:text-[10px] font-black uppercase tracking-wider border bg-red-50 text-red-600 border-red-100">
                                                    INATIVO
                                                </span>
                                            )}
                                            {isUserOnline(user.id) && (
                                                <span className="inline-flex items-center gap-1 text-[8px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 lg:py-1 rounded-full shrink-0 animate-pulse">
                                                    <div className="w-1 h-1 rounded-full bg-emerald-500" /> ONLINE
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-0.5 lg:gap-1 shrink-0">
                                    {user.id === currentUser?.id && (
                                        <button
                                            onClick={() => setShowPasswordModal(true)}
                                            className="p-1.5 lg:p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg lg:rounded-xl transition-all"
                                            title="Configurações da minha conta"
                                        >
                                            <Settings className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleEdit(user)}
                                        className="p-1.5 lg:p-2 text-slate-400 hover:text-[#FF4700] hover:bg-orange-50 rounded-lg lg:rounded-xl transition-all"
                                    >
                                        <Edit2 className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                                    </button>
                                    {user.role !== 'admin' && (
                                        <button
                                            onClick={() => handleToggleActive(user)}
                                            className={`p-1.5 lg:p-2 rounded-lg lg:rounded-xl transition-all ${user.isActive ? 'text-slate-400 hover:text-amber-500 hover:bg-amber-50' : 'text-amber-600 bg-amber-50'}`}
                                            title={user.isActive ? 'Desativar Usuário' : 'Ativar Usuário'}
                                        >
                                            <Shield className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                                        </button>
                                    )}
                                    {user.role !== 'admin' && (
                                        <button
                                            onClick={() => removeUser(user.id)}
                                            className="p-1.5 lg:p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg lg:rounded-xl transition-all"
                                            title="Arquivar Usuário"
                                        >
                                            <Trash2 className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2 lg:space-y-3">
                                <div className="flex items-center gap-2 lg:gap-3 text-[11px] lg:text-sm text-slate-500">
                                    <Mail className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0" />
                                    <span className="truncate">{user.email}</span>
                                </div>
                                <div className="flex items-center gap-2 lg:gap-3 text-[11px] lg:text-sm text-slate-500">
                                    <Shield className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0" />
                                    <span className="truncate">
                                        {user.role === 'admin' ? 'Acesso Total' :
                                            user.role === 'manager' ? 'Gerenciamento' :
                                                'Acesso Limitado'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
            </div>

            {showForm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-md rounded-3xl p-6 lg:p-8 shadow-2xl relative animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-2xl font-black text-slate-900 mb-6">{isEditing ? 'Editar Usuário' : 'Novo Usuário'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="flex justify-center mb-6">
                                <div className="relative group">
                                    <div className="w-24 h-24 rounded-3xl bg-slate-100 border-2 border-dashed border-slate-200 overflow-hidden flex items-center justify-center">
                                        {formData.avatar ? (
                                            <img src={formData.avatar} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-10 h-10 text-slate-300" />
                                        )}
                                        {uploading && (
                                            <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                                                <Loader2 className="w-6 h-6 animate-spin text-[#FF4700]" />
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="absolute -right-2 -bottom-2 p-2 bg-white rounded-xl shadow-lg border border-slate-100 text-slate-600 hover:text-[#FF4700] transition-all"
                                    >
                                        <Camera className="w-4 h-4" />
                                    </button>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleAvatarUpload}
                                        className="hidden"
                                        accept="image/*"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Nome</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-[#FF4700]/20 font-semibold text-slate-900"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Email</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full px-4 py-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-[#FF4700]/20 font-semibold text-slate-900"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Senha {isEditing && '(deixe em branco para manter)'}</label>
                                <input
                                    type="password"
                                    required={!isEditing}
                                    className="w-full px-4 py-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-[#FF4700]/20 font-semibold text-slate-900"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    placeholder={isEditing ? '••••••••' : ''}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Permissão</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['employee', 'manager', 'admin'].map((role) => (
                                        <button
                                            key={role}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, role: role as any })}
                                            className={`py-2 px-1 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${formData.role === role
                                                ? 'bg-[#FF4700] text-white border-[#FF4700]'
                                                : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'
                                                }`}
                                        >
                                            {getRoleLabel(role)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={uploading}
                                    className="flex-1 py-3 bg-[#FF4700] text-white font-bold rounded-xl shadow-glow-orange hover:bg-[#E64000] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {uploading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Processando...</span>
                                        </>
                                    ) : (
                                        isEditing ? 'Salvar Alterações' : 'Criar Usuário'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {showPasswordModal && (
                <AccountSettingsModal
                    isOpen={showPasswordModal}
                    onClose={() => setShowPasswordModal(false)}
                    onSuccess={(msg) => addNotification(msg, 'success')}
                />
            )}
        </div>
    );
}
