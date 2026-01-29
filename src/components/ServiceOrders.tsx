import { useState, useEffect } from 'react';
import { Plus, CheckCircle2, Clock, Smartphone, User, FileText, DollarSign, X, Image as ImageIcon, Search, Package, Trash2, Trash, Pencil } from 'lucide-react';
import ImageUpload from './ui/ImageUpload';
import { api } from '../lib/api';
import { useLanguage } from '../contexts/LanguageContext';
import { useTeam } from '../contexts/TeamContext';
import { useNotifications } from '../contexts/NotificationContext';

interface ServiceOrder {
    id: string;
    clientName: string;
    clientPhone?: string;
    deviceModel: string;
    description: string;
    status: 'pending' | 'in_progress' | 'finished' | 'delivered';
    price: number;
    createdAt: string;
    deliveredAt?: string | null;
    imageUrl?: string;
    frontImageUrl?: string;
    backImageUrl?: string;
    parts?: Array<{
        id: string;
        productId: string;
        quantity: number;
        unitPrice: number;
        product: { name: string };
    }>;
}

export default function ServiceOrders() {
    const { t, locale } = useLanguage();
    const { currentUser } = useTeam();
    const { addNotification } = useNotifications();
    const isAdmin = currentUser?.role === 'admin';
    const [services, setServices] = useState<ServiceOrder[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        clientName: '',
        clientPhone: '',
        deviceModel: '',
        description: '',
        price: '',
        imageUrl: '',
        frontImageUrl: '',
        backImageUrl: ''
    });
    const [viewImage, setViewImage] = useState<string | null>(null);
    const [availableProducts, setAvailableProducts] = useState<any[]>([]);
    const [selectedParts, setSelectedParts] = useState<any[]>([]);
    const [partSearch, setPartSearch] = useState('');
    const [showPartSearch, setShowPartSearch] = useState(false);

    useEffect(() => {
        if (showForm) {
            api.products.list().then(setAvailableProducts).catch(console.error);
        }
    }, [showForm]);

    useEffect(() => {
        loadServices();

        // Socket.io Real-time listener
        const handleUpdate = (data: any) => {
            if (data.type === 'services' || data.type === 'system') {
                console.log(`[Real-time] Refreshing services due to: ${data.action}`);
                loadServices();
            }
        };

        const socketPromise = import('../lib/api').then(m => m.socket);
        socketPromise.then(s => s.on('data-updated', handleUpdate));

        return () => {
            socketPromise.then(s => s.off('data-updated', handleUpdate));
        };
    }, []);

    const loadServices = async () => {
        try {
            const data = await api.services.list();
            setServices(data || []);
        } catch (error) {
            console.error('Error loading services:', error);
        }
    };

    const handleUpdateStatus = async (id: string, status: string) => {
        if (!isAdmin) {
            try {
                await api.permissionRequests.create({
                    type: 'UPDATE_SERVICE_STATUS',
                    details: { status },
                    targetId: id
                });
                addNotification?.(t('requestSent') || 'Solicitação enviada ao administrador', 'info');
                return;
            } catch (error) {
                console.error('Error sending request:', error);
                return;
            }
        }
        try {
            const updated = await api.services.update(id, { status });
            setServices(services.map((s: ServiceOrder) => s.id === id ? updated : s));
        } catch (error) {
            console.error('Error updating service status:', error);
        }
    };

    const handleDeleteService = async (id: string) => {
        if (!confirm(t('deleteTransactionConfirm') || 'Tem certeza que deseja excluir?')) return;

        if (!isAdmin) {
            try {
                await api.permissionRequests.create({
                    type: 'DELETE_SERVICE',
                    details: { id },
                    targetId: id
                });
                addNotification?.(t('requestSent') || 'Solicitação de exclusão enviada', 'info');
                return;
            } catch (error) {
                console.error('Error sending request:', error);
                return;
            }
        }

        try {
            await api.services.delete(id);
            setServices(services.filter((s: ServiceOrder) => s.id !== id));
        } catch (error) {
            console.error('Error deleting service:', error);
        }
    };

    const handleSaveService = async () => {
        try {
            const servicePrice = parseFloat(formData.price) || 0;
            const serviceParts = selectedParts.map(p => ({ productId: p.id, quantity: p.qty }));

            if (!isAdmin) {
                await api.permissionRequests.create({
                    type: editingId ? 'UPDATE_SERVICE' : 'CREATE_SERVICE',
                    details: {
                        ...formData,
                        price: servicePrice,
                        parts: serviceParts
                    },
                    targetId: editingId || undefined
                });
                addNotification?.(t('requestSent') || 'Solicitação enviada ao administrador', 'info');
                setShowForm(false);
                setEditingId(null);
                setFormData({ clientName: '', clientPhone: '', deviceModel: '', description: '', price: '', imageUrl: '', frontImageUrl: '', backImageUrl: '' });
                setSelectedParts([]);
                return;
            }

            if (editingId) {
                const updated = await api.services.update(editingId, {
                    ...formData,
                    price: servicePrice
                });
                setServices(services.map(s => s.id === editingId ? updated : s));
            } else {
                const newService = await api.services.create({
                    ...formData,
                    status: 'pending',
                    price: servicePrice,
                    parts: serviceParts
                });
                setServices([newService, ...services]);
            }
            setShowForm(false);
            setEditingId(null);
            setFormData({ clientName: '', clientPhone: '', deviceModel: '', description: '', price: '', imageUrl: '', frontImageUrl: '', backImageUrl: '' });
            setSelectedParts([]);
        } catch (error) {
            console.error('Error saving service:', error);
        }
    };

    const handleEditService = (service: ServiceOrder) => {
        setFormData({
            clientName: service.clientName,
            clientPhone: service.clientPhone || '',
            deviceModel: service.deviceModel,
            description: service.description,
            price: service.price.toString(),
            imageUrl: service.imageUrl || '',
            frontImageUrl: service.frontImageUrl || '',
            backImageUrl: service.backImageUrl || ''
        });
        setEditingId(service.id);
        setShowForm(true);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
            case 'in_progress': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
            case 'finished': return 'bg-green-500/10 text-green-600 border-green-500/20';
            case 'delivered': return 'bg-slate-500/10 text-slate-600 border-slate-500/20';
            default: return 'bg-slate-500/10 text-slate-600';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'pending': return t('pending');
            case 'in_progress': return t('inProgress');
            case 'finished': return t('finished');
            case 'delivered': return t('delivered');
            default: return status;
        }
    };

    return (
        <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 lg:gap-6">
                <div className="space-y-0.5 lg:space-y-1">
                    <h2 className="text-xl lg:text-3xl font-black text-slate-900 tracking-tight">{t('serviceManagement')}</h2>
                    <p className="text-slate-500 font-bold text-[9px] lg:text-base uppercase tracking-wider">{t('repairControl')}</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center justify-center gap-2 px-6 py-3 lg:py-3.5 bg-[#FF4700] text-white text-[11px] lg:text-sm font-bold rounded-xl shadow-glow-orange hover:bg-[#E64000] transition-all active:scale-95 w-full md:w-auto"
                >
                    <Plus className="w-5 h-5 lg:w-4 lg:h-4" />
                    <span>{t('newService')}</span>
                </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4">
                {['pending', 'in_progress', 'finished', 'delivered'].map(status => (
                    <div key={status} className="bg-white p-2.5 lg:p-6 rounded-xl lg:rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-12 h-12 lg:w-16 lg:h-16 bg-slate-50 rounded-full -mr-6 -mt-6 lg:-mr-8 lg:-mt-8 group-hover:bg-slate-100 transition-colors" />
                        <div className="flex justify-between items-start relative z-10 mb-2 lg:mb-4">
                            <h3 className="text-[7px] lg:text-xs font-black text-slate-400 uppercase tracking-wider">{getStatusLabel(status)}</h3>
                            {status === 'pending' && <Clock className="w-3 h-3 text-yellow-500" />}
                            {status === 'in_progress' && <Clock className="w-3 h-3 text-blue-500 animate-spin-slow" />}
                            {status === 'finished' && <CheckCircle2 className="w-3 h-3 text-orange-500" />}
                            {status === 'delivered' && <Package className="w-3 h-3 text-slate-400" />}
                        </div>
                        <div className="flex flex-col relative z-10">
                            <div className="text-base lg:text-2xl font-black text-slate-900 leading-none">
                                {Array.isArray(services) ? services.filter((s: ServiceOrder) => s.status === status).length : 0}
                                <span className="text-[8px] lg:text-[10px] text-slate-400 ml-1 uppercase">{t('items')}</span>
                            </div>
                            <div className="text-[10px] lg:text-sm font-bold text-[#FF4700] mt-1 lg:mt-2">
                                MT {(Array.isArray(services) ? services.filter((s: ServiceOrder) => s.status === status).reduce((acc, curr) => acc + (curr.price || 0), 0) : 0).toLocaleString(locale, { minimumFractionDigits: 0 })}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid gap-4">
                {!Array.isArray(services) || services.length === 0 ? (
                    <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-200 text-center space-y-3">
                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto text-slate-300">
                            <Clock className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">{t('noServiceFound')}</h3>
                        <p className="text-slate-500">{t('clickToStart')}</p>
                    </div>
                ) : services.map((service) => (
                    <div key={service.id} className="bg-white p-3 lg:p-6 rounded-xl lg:rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group flex flex-col md:flex-row items-baseline md:items-center justify-between gap-3 lg:gap-6">
                        <div className="flex-1 w-full space-y-2 lg:space-y-3">
                            <div className="flex flex-wrap items-center gap-1.5 lg:gap-2">
                                <span className={`px-1.5 py-0.5 lg:px-3 lg:py-1 rounded-md lg:rounded-lg text-[7px] lg:text-[10px] font-black uppercase tracking-wider border ${getStatusColor(service.status)}`}>
                                    {getStatusLabel(service.status)}
                                </span>
                                <span className="text-slate-400 text-[10px] font-bold flex items-center gap-1.5">
                                    <Clock className="w-3 h-3" />
                                    {service.createdAt ? (
                                        <>
                                            {new Date(service.createdAt).toLocaleDateString(locale)}
                                            <span className="opacity-50 mx-1">|</span>
                                            {new Date(service.createdAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                                        </>
                                    ) : '---'}
                                </span>
                                {service.deliveredAt && (
                                    <span className="text-green-500 text-[7px] lg:text-[10px] font-black flex items-center gap-0.5 lg:gap-1 uppercase tracking-wider">
                                        <CheckCircle2 className="w-2 h-2 lg:w-2.5 lg:h-2.5" />
                                        {t('delivered')}
                                    </span>
                                )}
                            </div>
                            <div className="flex gap-2 lg:gap-3">
                                {service.imageUrl && (
                                    <div
                                        className="w-10 h-10 lg:w-16 lg:h-16 rounded-lg lg:rounded-xl overflow-hidden border border-slate-100 shrink-0 cursor-zoom-in group/img relative"
                                        onClick={() => setViewImage(service.imageUrl || null)}
                                    >
                                        <img src={service.imageUrl} alt={t('device')} className="w-full h-full object-cover transition-transform group-hover/img:scale-110" />
                                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                            <Search className="w-4 h-4 text-white" />
                                        </div>
                                    </div>
                                )}
                                {service.frontImageUrl && (
                                    <div
                                        className="w-10 h-10 lg:w-16 lg:h-16 rounded-lg lg:rounded-xl overflow-hidden border border-slate-100 shrink-0 cursor-zoom-in group/img relative"
                                        onClick={() => setViewImage(service.frontImageUrl || null)}
                                    >
                                        <img src={service.frontImageUrl} alt="Front" className="w-full h-full object-cover transition-transform group-hover/img:scale-110" />
                                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-[8px] text-white font-black uppercase">
                                            {t('frontPhoto')}
                                        </div>
                                    </div>
                                )}
                                {service.backImageUrl && (
                                    <div
                                        className="w-10 h-10 lg:w-16 lg:h-16 rounded-lg lg:rounded-xl overflow-hidden border border-slate-100 shrink-0 cursor-zoom-in group/img relative"
                                        onClick={() => setViewImage(service.backImageUrl || null)}
                                    >
                                        <img src={service.backImageUrl} alt="Back" className="w-full h-full object-cover transition-transform group-hover/img:scale-110" />
                                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-[8px] text-white font-black uppercase">
                                            {t('backPhoto')}
                                        </div>
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <h3 className="text-xs lg:text-lg font-black text-slate-900 truncate leading-tight">{service.deviceModel}</h3>
                                    <div className="flex flex-col gap-0.5 mt-0.5 lg:mt-1 overflow-hidden">
                                        <span className="flex items-center gap-1 text-[9px] lg:text-sm text-slate-500 font-bold truncate">
                                            <User className="w-2.5 h-2.5 text-slate-400" /> {service.clientName}
                                        </span>
                                        <span className="flex items-center gap-1 text-[9px] lg:text-sm text-slate-400 truncate italic">
                                            <FileText className="w-2.5 h-2.5 text-slate-400" /> {service.description}
                                        </span>
                                        {service.parts && service.parts.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {service.parts.map((p, i) => (
                                                    <span key={i} className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[8px] font-bold rounded uppercase">
                                                        {p.quantity}x {p.product?.name || t('part')}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-slate-50 pt-2 lg:pt-0">
                            <div className="text-left md:text-right">
                                <p className="text-[7px] lg:text-[8px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-0.5 lg:mb-1">{t('value')}</p>
                                <p className="text-base lg:text-xl font-black text-[#FF4700]">MT {(service.price || 0).toLocaleString(locale, { minimumFractionDigits: 2 })}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {service.status === 'pending' && (
                                    <button
                                        onClick={() => handleUpdateStatus(service.id, 'in_progress')}
                                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all font-black text-[10px] uppercase tracking-wider border border-blue-100"
                                    >
                                        <Clock className="w-3.5 h-3.5" />
                                        {t('start')}
                                    </button>
                                )}
                                {service.status === 'in_progress' && (
                                    <button
                                        onClick={() => handleUpdateStatus(service.id, 'finished')}
                                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-50 text-orange-600 hover:bg-orange-100 transition-all font-black text-[10px] uppercase tracking-wider border border-orange-100"
                                    >
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        {t('finish')}
                                    </button>
                                )}
                                {service.status === 'finished' && (
                                    <button
                                        onClick={() => handleUpdateStatus(service.id, 'delivered')}
                                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 transition-all font-black text-[10px] uppercase tracking-wider border border-green-100"
                                    >
                                        <Package className="w-3.5 h-3.5" />
                                        {t('deliver')}
                                    </button>
                                )}
                                {isAdmin && (
                                    <button
                                        onClick={() => handleEditService(service)}
                                        className="p-2.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all border border-blue-100"
                                        title={t('edit')}
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                )}
                                {isAdmin && (
                                    <button
                                        onClick={() => handleDeleteService(service.id)}
                                        className="p-2.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all border border-rose-100"
                                        title={t('delete')}
                                    >
                                        <Trash className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {showForm && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 lg:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full sm:max-w-lg rounded-t-[32px] sm:rounded-[32px] p-5 lg:p-8 shadow-2xl relative animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-2 duration-500 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto custom-scrollbar pb-safe">
                        <div className="flex items-center justify-between mb-5 sticky top-0 bg-white z-10 pb-2">
                            <div>
                                <h2 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight">{editingId ? t('editProduct') : t('newService')}</h2>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">{editingId ? 'Atualização de Ativo' : 'Registro de Ativo Digital'}</p>
                            </div>
                            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="w-10 h-10 flex items-center justify-center bg-slate-100 text-slate-500 hover:text-slate-900 rounded-full active:scale-90 transition-all border border-slate-200">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-1.5 lg:space-y-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 lg:gap-2">
                                <div className="space-y-1">
                                    <label className="text-[10px] lg:text-xs font-black text-slate-500 uppercase tracking-wider mb-1 block">{t('client')}</label>
                                    <div className="relative group">
                                        <User className="absolute left-3.5 lg:left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#FF4700] transition-colors" />
                                        <input
                                            type="text"
                                            placeholder={t('client')}
                                            className="w-full pl-10 lg:pl-11 pr-4 py-3.5 lg:py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-[#FF4700]/20 font-bold text-sm transition-all"
                                            value={formData.clientName}
                                            onChange={e => setFormData({ ...formData, clientName: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] lg:text-xs font-black text-slate-500 uppercase tracking-wider mb-1 block">{t('phone')}</label>
                                    <div className="relative group">
                                        <Smartphone className="absolute left-3.5 lg:left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#FF4700] transition-colors" />
                                        <input
                                            type="text"
                                            placeholder={t('phoneNumberPlaceholder')}
                                            className="w-full pl-10 lg:pl-11 pr-4 py-3.5 lg:py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-[#FF4700]/20 font-bold text-sm transition-all"
                                            value={formData.clientPhone}
                                            onChange={e => setFormData({ ...formData, clientPhone: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 lg:gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] lg:text-xs font-black text-slate-500 uppercase tracking-wider mb-1 block">{t('device')}</label>
                                    <div className="relative group">
                                        <Smartphone className="absolute left-3.5 lg:left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#FF4700] transition-colors" />
                                        <input
                                            type="text"
                                            placeholder={t('model')}
                                            className="w-full pl-10 lg:pl-11 pr-4 py-3.5 lg:py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-[#FF4700]/20 font-bold text-sm transition-all"
                                            value={formData.deviceModel}
                                            onChange={e => setFormData({ ...formData, deviceModel: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] lg:text-xs font-black text-slate-500 uppercase tracking-wider mb-1 block">{t('value')} (MT)</label>
                                    <div className="relative group">
                                        <DollarSign className="absolute left-3.5 lg:left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            className="w-full pl-10 lg:pl-11 pr-4 py-3.5 lg:py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-emerald-500/20 font-black text-sm transition-all text-emerald-600"
                                            value={formData.price}
                                            onChange={e => setFormData({ ...formData, price: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] lg:text-xs font-black text-slate-500 uppercase tracking-wider mb-1 block">{t('problemDescription')}</label>
                                <textarea
                                    placeholder={t('problemDescription')}
                                    className="w-full px-4 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-[#FF4700]/20 font-bold h-24 lg:h-28 text-sm resize-none transition-all"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2 pt-2 border-t border-slate-100">
                                <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                    <Package className="w-3.5 h-3.5 text-[#FF4700]" /> {t('appliedParts')}
                                </h3>

                                <div className="space-y-2">
                                    {selectedParts.map((part) => (
                                        <div key={part.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100">
                                            <div className="min-w-0">
                                                <p className="text-[11px] font-bold text-slate-900 truncate">{part.name}</p>
                                                <p className="text-[9px] text-slate-500">MT {part.price.toFixed(2)} un</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border border-slate-200">
                                                    <button onClick={() => setSelectedParts(prev => prev.map(p => p.id === part.id ? { ...p, qty: Math.max(1, p.qty - 1) } : p))} className="text-slate-400 hover:text-slate-600 font-bold">-</button>
                                                    <span className="text-xs font-black min-w-[20px] text-center">{part.qty}</span>
                                                    <button onClick={() => setSelectedParts(prev => prev.map(p => p.id === part.id ? { ...p, qty: Math.min(part.stock, p.qty + 1) } : p))} className="text-slate-400 hover:text-slate-600 font-bold">+</button>
                                                </div>
                                                <button onClick={() => setSelectedParts(prev => prev.filter(p => p.id !== part.id))} className="text-rose-500 hover:text-rose-700">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    <div className="relative">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input
                                                type="text"
                                                placeholder={t('addPart')}
                                                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold focus:ring-2 focus:ring-[#FF4700]/20"
                                                value={partSearch}
                                                onChange={(e) => {
                                                    setPartSearch(e.target.value);
                                                    setShowPartSearch(true);
                                                }}
                                                onFocus={() => setShowPartSearch(true)}
                                            />
                                        </div>

                                        {showPartSearch && partSearch.length > 0 && (
                                            <div className="absolute z-60 left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-48 overflow-y-auto custom-scrollbar">
                                                {availableProducts
                                                    .filter(p => p.name.toLowerCase().includes(partSearch.toLowerCase()) && p.stock > 0 && !selectedParts.some(sp => sp.id === p.id))
                                                    .map(product => (
                                                        <button
                                                            key={product.id}
                                                            onClick={() => {
                                                                setSelectedParts([...selectedParts, { ...product, qty: 1 }]);
                                                                setPartSearch('');
                                                                setShowPartSearch(false);
                                                            }}
                                                            className="w-full p-3 text-left hover:bg-slate-50 flex items-center justify-between group transition-colors"
                                                        >
                                                            <div>
                                                                <p className="text-xs font-bold text-slate-800 tracking-tight">{product.name}</p>
                                                                <p className="text-[10px] text-slate-400 uppercase font-black">{t('stockLabel')} {product.stock} un</p>
                                                            </div>
                                                            <Plus className="w-4 h-4 text-slate-300 group-hover:text-[#FF4700]" />
                                                        </button>
                                                    ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2 pt-2 border-t border-slate-100">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-2">
                                        <ImageIcon className="w-3 h-3" /> {t('frontPhoto')}
                                    </label>
                                    <ImageUpload
                                        onUpload={(url) => setFormData({ ...formData, frontImageUrl: url })}
                                        initialUrl={formData.frontImageUrl}
                                        bucket="service-orders"
                                        compact={true}
                                        className="w-full"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-2">
                                        <ImageIcon className="w-3 h-3" /> {t('backPhoto')}
                                    </label>
                                    <ImageUpload
                                        onUpload={(url) => setFormData({ ...formData, backImageUrl: url })}
                                        initialUrl={formData.backImageUrl}
                                        bucket="service-orders"
                                        compact={true}
                                        className="w-full"
                                    />
                                </div>
                            </div>
                            <div className="hidden">
                                <label className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                                    <ImageIcon className="w-3.5 h-3.5" /> {t('devicePhoto')}
                                </label>
                                <ImageUpload
                                    onUpload={(url) => setFormData({ ...formData, imageUrl: url })}
                                    initialUrl={formData.imageUrl}
                                    bucket="service-orders"
                                    compact={true}
                                />
                            </div>
                            <button
                                onClick={handleSaveService}
                                className="w-full py-4 lg:py-5 bg-gradient-to-r from-[#FF4700] to-[#FF6A00] text-white font-black uppercase text-xs lg:text-sm tracking-[0.2em] rounded-24 lg:rounded-2xl shadow-glow-orange hover:brightness-110 active:scale-[0.98] transition-all mt-4 mb-2"
                            >
                                {editingId ? t('save') : t('newService')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Full Image Viewer - Optimized for Mobile & iOS */}
            {viewImage && (
                <div
                    className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 md:p-8 animate-in fade-in duration-300"
                    onClick={() => setViewImage(null)}
                    style={{ overscrollBehavior: 'contain' }}
                >
                    <button
                        className="absolute top-safe-4 right-6 lg:top-8 lg:right-8 w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors z-[210] active:scale-90"
                        onClick={() => setViewImage(null)}
                    >
                        <X className="w-6 h-6 md:w-8 md:h-8" />
                    </button>

                    <div className="relative w-full h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
                        <img
                            src={viewImage}
                            className="max-w-full max-h-full object-contain rounded-2xl shadow-[0_0_100px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-500"
                        />
                    </div>

                    {/* iOS Home Indicator Padding */}
                    <div className="absolute bottom-0 h-10 w-full pointer-events-none" />
                </div>
            )}
        </div>
    );
}
