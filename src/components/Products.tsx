import { useState, useEffect } from 'react';
import logo from '../assets/logo.png';
import { Plus, Tag, DollarSign, Layers, X, Pencil, Image as ImageIcon, ArrowUpRight, ArrowDownRight, AlertTriangle, Trash2, ShoppingCart, Check, Clock } from 'lucide-react';
import ImageUpload from './ui/ImageUpload';
import DataTable, { TableColumn } from './dashboard/DataTable';
import { Product } from '../lib/supabase';
import { api } from '../lib/api';
import { useTeam } from '../contexts/TeamContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useTransactions } from '../contexts/TransactionContext';
import { useLanguage } from '../contexts/LanguageContext';
import ProductBadge from './ui/ProductBadge';
import { searchProducts } from '../lib/search';

interface ProductAnalytics extends Product {
    totalSales?: number;
    salesVelocity?: number;
    daysSinceLastMovement?: number;
    status: any;
}

interface ProductsProps {
    searchQuery?: string;
}

export default function Products({ searchQuery = '' }: ProductsProps) {
    const { currentUser } = useTeam();
    const { addNotification } = useNotifications();
    const { t, locale } = useLanguage();
    const { products, pendingRequests, loading, refreshData } = useTransactions();

    // We still keep a small local state for optimistic updates during the current session
    // but we initialize it from the global products.
    const [localProducts, setLocalProducts] = useState<ProductAnalytics[]>([]);

    useEffect(() => {
        setLocalProducts(products);
    }, [products]);
    const [showForm, setShowForm] = useState(false);
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [adjustData, setAdjustData] = useState({ type: 'entry' as 'entry' | 'exit', quantity: '', reason: '', isFinancial: false });
    const [isQuickSell, setIsQuickSell] = useState(false);
    const [isSellingId, setIsSellingId] = useState<string | null>(null);

    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        category: 'Smartphones & Tablets',
        price: '',
        costPrice: '',
        stock: '',
        minStock: '5',
        image_url: ''
    });

    const isAdmin = currentUser?.role === 'admin';

    const handleApproveRequest = async (id: string) => {
        try {
            await api.permissionRequests.update(id, 'approved');
            addNotification(t('requestApproved') || 'Solicitação aprovada!', 'success');
            refreshData();
        } catch (error) {
            addNotification(t('errorApproving') || 'Erro ao aprovar solicitação', 'error');
        }
    };

    const handleRejectRequest = async (id: string) => {
        try {
            await api.permissionRequests.update(id, 'rejected');
            addNotification(t('requestRejected') || 'Solicitação rejeitada', 'info');
            refreshData();
        } catch (error) {
            addNotification(t('errorRejecting') || 'Erro ao rejeitar solicitação', 'error');
        }
    };


    // refreshData is already available via destructuring at line 30

    async function handleAdjustStock() {
        if (!selectedProduct || !adjustData.quantity || !currentUser) return;

        const qty = parseInt(adjustData.quantity);
        if (adjustData.type === 'exit' && selectedProduct.stock < qty) {
            addNotification(t('insufficientStock'), 'error');
            return;
        }
        if (adjustData.type === 'exit' && (selectedProduct.stock - qty) < 0) {
            addNotification(t('negativeStockError'), 'error');
            return;
        }

        if (!isAdmin && !isQuickSell) {
            try {
                await api.permissionRequests.create({
                    type: 'UPDATE_PRODUCT',
                    details: {
                        ...selectedProduct,
                        stock: selectedProduct.stock + (adjustData.type === 'entry' ? qty : -qty),
                        // Add reason to details so admin can see why
                        _reason: adjustData.reason || (adjustData.type === 'entry' ? 'Entrada Manual' : 'Saída Manual')
                    },
                    targetId: selectedProduct.id
                });
                addNotification(t('requestSent') || 'Solicitação de ajuste enviada ao administrador', 'info');
                setShowAdjustModal(false);
                return;
            } catch (error) {
                addNotification(t('errorSendingRequest') || 'Erro ao enviar solicitação', 'error');
                return;
            }
        }

        try {
            await api.products.adjustStock({
                productId: selectedProduct.id,
                userId: currentUser.id,
                type: adjustData.type,
                quantity: qty,
                reason: adjustData.reason,
                isFinancial: isQuickSell || adjustData.isFinancial
            });

            if (adjustData.type === 'exit') {
                addNotification(t('itemsRemoved').replace('{count}', qty.toString()), 'success');
            } else {
                addNotification(t('productUpdated'), 'success');
            }

            // Optimistic update
            const newStock = selectedProduct.stock + (adjustData.type === 'entry' ? qty : -qty);
            const adjustedProduct = {
                ...selectedProduct,
                stock: newStock,
                status: newStock > 0 ? 'active' : 'out_of_stock'
            };
            setLocalProducts(prev => prev.map(p => p.id === selectedProduct.id ? { ...p, ...adjustedProduct } : p));

            setShowAdjustModal(false);
            setAdjustData({ type: 'entry', quantity: '', reason: '', isFinancial: false });

            // Global refresh for real-time totals
            refreshData();
        } catch (error: any) {
            const errorMsg = error.response?.data?.error || t('errorSavingProduct');
            addNotification(errorMsg, 'error');
        }
    }

    async function handleSaveProduct() {
        if (!formData.name || !formData.price || !formData.stock) return;

        const productData = {
            name: formData.name,
            category: formData.category,
            price: parseFloat(formData.price),
            costPrice: parseFloat(formData.costPrice || '0'),
            stock: parseInt(formData.stock),
            minStock: parseInt(formData.minStock),
            image_url: formData.image_url,
        };

        if (!isAdmin) {
            try {
                await api.permissionRequests.create({
                    type: isEditing ? 'UPDATE_PRODUCT' : 'CREATE_PRODUCT',
                    details: productData,
                    targetId: editId || undefined
                });
                addNotification(t('requestSent') || 'Solicitação enviada ao administrador', 'info');
                setShowForm(false);
                setIsEditing(false);
                setEditId(null);
                setFormData({ name: '', category: 'Smartphones & Tablets', price: '', costPrice: '', stock: '', minStock: '5', image_url: '' });
                return;
            } catch (error) {
                addNotification(t('errorSendingRequest') || 'Erro ao enviar solicitação', 'error');
                return;
            }
        }

        try {
            if (isEditing && editId) {
                // Optimistic update for edit
                const updatedProduct = {
                    ...productData,
                    id: editId,
                    status: productData.stock > 0 ? 'active' : 'out_of_stock'
                };
                setLocalProducts(prev => prev.map(p => p.id === editId ? {
                    ...p,
                    ...updatedProduct,
                    totalSales: p.totalSales,
                    salesVelocity: p.salesVelocity,
                    daysSinceLastMovement: p.daysSinceLastMovement
                } : p));

                await api.products.update(editId, productData);
                addNotification(t('productUpdated'), 'success');
            } else {
                const data = await api.products.create(productData);
                const newProduct: ProductAnalytics = {
                    ...data,
                    totalSales: 0,
                    salesVelocity: 0,
                    daysSinceLastMovement: -1,
                    status: 'no-movement',
                    badge: { type: 'no-movement', label: 'Novo', color: 'blue' }
                };
                setLocalProducts(prev => [newProduct, ...prev]);
                addNotification(t('productCreated'), 'success');
            }

            // Sync global stats immediately
            refreshData();

            setShowForm(false);
            setIsEditing(false);
            setEditId(null);
            setFormData({ name: '', category: 'Smartphones & Tablets', price: '', costPrice: '', stock: '', minStock: '5', image_url: '' });
        } catch (error: any) {
            console.error('Error saving product:', error);
            const errorMsg = error.response?.data?.error || t('errorSavingProduct');
            addNotification(errorMsg, 'error');
        }
    }

    function handleEdit(product: Product) {
        setFormData({
            name: product.name,
            category: product.category,
            price: product.price.toString(),
            costPrice: (product.costPrice || 0).toString(),
            stock: product.stock.toString(),
            minStock: (product.minStock || 0).toString(),
            image_url: product.image_url || ''
        });
        setEditId(product.id);
        setIsEditing(true);
        setShowForm(true);
    }

    async function handleDeleteProduct(id: string) {
        if (!confirm(t('deleteProductConfirm'))) return;

        if (!isAdmin) {
            try {
                await api.permissionRequests.create({
                    type: 'DELETE_PRODUCT',
                    details: { id },
                    targetId: id
                });
                addNotification(t('requestSent') || 'Solicitação de exclusão enviada', 'info');
                return;
            } catch (error) {
                addNotification(t('errorSendingRequest') || 'Erro ao enviar solicitação', 'error');
                return;
            }
        }

        try {
            await api.products.delete([id]);
            setLocalProducts(prev => prev.filter(p => p.id !== id));
            addNotification(t('productDeleted'), 'warning');
        } catch (error) {
            console.error('Error deleting product:', error);
            addNotification(t('errorDeletingProduct'), 'error');
        }
    }

    const [confirmQuickSell, setConfirmQuickSell] = useState<Product | null>(null);

    async function handleQuickSell(product: Product) {
        if (!currentUser || isSellingId) return;
        if (product.stock < 1) {
            addNotification(t('insufficientStock'), 'error');
            return;
        }

        setConfirmQuickSell(product);
    }

    async function executeQuickSell(product: Product) {
        if (!currentUser) return;
        setConfirmQuickSell(null);

        if (!isAdmin) {
            try {
                await api.permissionRequests.create({
                    type: 'UPDATE_PRODUCT',
                    details: {
                        ...product,
                        stock: product.stock - 1,
                        _reason: t('quickSell')
                    },
                    targetId: product.id
                });
                addNotification(t('requestSent') || 'Solicitação de venda enviada ao administrador', 'info');
                return;
            } catch (error) {
                addNotification(t('errorSendingRequest') || 'Erro ao enviar solicitação', 'error');
                return;
            }
        }

        setIsSellingId(product.id);
        try {
            await api.products.adjustStock({
                productId: product.id,
                userId: currentUser.id,
                type: 'exit',
                quantity: 1,
                reason: t('quickSell'),
                isFinancial: true
            });

            // Optimistic update for immediate feedback
            setLocalProducts(prev => prev.map(p =>
                p.id === product.id ? {
                    ...p,
                    stock: p.stock - 1,
                    status: (p.stock - 1) > 0 ? 'active' : 'out_of_stock'
                } : p
            ));

            addNotification(t('quickSellSuccess'), 'success');

            // Global refresh for dashboard and financial hubs
            await refreshData();
        } catch (error) {
            console.error('Error in instant sale:', error);
            addNotification(t('quickSellError'), 'error');
        } finally {
            setIsSellingId(null);
        }
    }

    const filteredProducts = searchProducts(localProducts, searchQuery);

    const columns: TableColumn[] = [
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
            render: (value: any, row: ProductAnalytics) => (
                <div className="flex items-center gap-3">
                    <span className="font-bold text-[#FF4700] group-hover:underline cursor-pointer">{value as string}</span>
                    {row.status && row.status !== 'normal' && Object.keys({ 'best-seller': 1, 'low-sales': 1, 'no-movement': 1, 'stagnant': 1 }).includes(row.status) && (
                        <ProductBadge type={row.status} />
                    )}
                </div>
            )
        },
        {
            header: t('category'),
            accessor: 'category',
            render: (value: any) => (
                <span className="text-[12px] text-slate-500 uppercase font-bold tracking-wider">
                    {value as string}
                </span>
            )
        },
        {
            header: t('price'),
            accessor: 'price',
            render: (value: any) => (
                <span className="font-bold text-slate-800">MT {(Number(value) || 0).toLocaleString(locale, { minimumFractionDigits: 2 })}</span>
            )
        },
        {
            header: t('qty'),
            accessor: 'stock',
            render: (value: any, row: Product) => {
                const stock = value as number;
                const minStock = row.minStock || 0;
                const isLow = stock <= minStock;
                return (
                    <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${stock === 0 ? 'bg-red-600' : isLow ? 'bg-orange-500 animate-pulse' : 'bg-[#FF4700]'}`} />
                        <div className="flex flex-col">
                            <span className={`font-bold ${stock === 0 ? 'text-red-600' : isLow ? 'text-orange-500' : 'text-slate-600'}`}>
                                {stock} un
                            </span>
                            {isLow && stock > 0 && <span className="text-[9px] font-black text-orange-400 uppercase tracking-tighter">{t('lowStock')}</span>}
                            {stock === 0 && <span className="text-[9px] font-black text-red-500 uppercase tracking-tighter">{t('outOfStock')}</span>}
                        </div>
                    </div>
                );
            }
        },
        {
            header: t('actions'),
            accessor: 'id',
            render: (value: any, row: Product) => (
                <div className="flex gap-1.5 lg:gap-2">
                    <button
                        onClick={() => {
                            setSelectedProduct(row);
                            setIsQuickSell(false);
                            setAdjustData(prev => ({ ...prev, quantity: '' })); // Reset quantity for normal adjust
                            setShowAdjustModal(true);
                        }}
                        className="p-1 px-2 lg:px-3 lg:py-1 text-[9px] lg:text-[11px] font-black text-slate-600 hover:bg-slate-100 rounded-lg transition-all uppercase flex items-center gap-1 border border-slate-100"
                    >
                        {t('qty')}
                    </button>
                    <button
                        onClick={() => handleQuickSell(row)}
                        disabled={isSellingId === row.id || row.stock <= 0}
                        className={`p-1 px-2 lg:px-3 lg:py-1 text-[9px] lg:text-[11px] font-black rounded-lg transition-all uppercase flex items-center gap-1 border ${isSellingId === row.id
                            ? 'bg-slate-50 text-slate-400 border-slate-100 cursor-wait'
                            : 'text-emerald-600 border-emerald-100 hover:bg-emerald-50'
                            }`}
                        title={t('quickSell')}
                    >
                        <ShoppingCart className="w-2.5 h-2.5 lg:w-3 lg:h-3" />
                        <span className="hidden lg:inline">{isSellingId === row.id ? t('selling') : t('sell')}</span>
                    </button>
                    <button
                        onClick={() => handleEdit(row)}
                        className="p-1 px-2 lg:px-3 lg:py-1 text-[9px] lg:text-[11px] font-black text-[#FF4700] border border-orange-100 hover:bg-[#FF4700]/10 rounded-lg transition-all uppercase flex items-center gap-1"
                    >
                        <Pencil className="w-2.5 h-2.5 lg:w-3 lg:h-3" /> <span className="hidden lg:inline">{t('edit')}</span>
                    </button>
                    <button
                        onClick={() => handleDeleteProduct(value as string)}
                        className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                    >
                        <Trash2 className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                    </button>
                </div>
            )
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
        <div className="space-y-6 max-w-[1600px] mx-auto transition-all duration-500">
            {isAdmin && pendingRequests.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-3xl p-6 mb-6 animate-slide-up">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-orange-100 rounded-xl text-orange-600">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-orange-900 uppercase tracking-tight">Solicitações Pendentes ({pendingRequests.length})</h3>
                            <p className="text-xs font-bold text-orange-700/60 uppercase">Outros usuários solicitaram alterações no estoque</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pendingRequests.map(req => {
                            const details = JSON.parse(req.details);
                            return (
                                <div key={req.id} className="bg-white border border-orange-100 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] font-black px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full uppercase">
                                                {req.type === 'CREATE_PRODUCT' ? 'Novo Produto' : req.type === 'UPDATE_PRODUCT' ? 'Edição' : 'Exclusão'}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400">{new Date(req.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-sm font-black text-slate-800 mb-1">{details.name || 'Produto ID: ' + (req.targetId || 'Novo')}</p>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase">Solicitante: <span className="text-orange-600">{req.user.name}</span></p>
                                    </div>
                                    <div className="flex items-center gap-2 mt-4">
                                        <button
                                            onClick={() => handleApproveRequest(req.id)}
                                            className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-1"
                                        >
                                            <Check className="w-3 h-3" /> Aprovar
                                        </button>
                                        <button
                                            onClick={() => handleRejectRequest(req.id)}
                                            className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-1"
                                        >
                                            <X className="w-3 h-3" /> Rejeitar
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 lg:gap-8 animate-slide-up">
                <div className="space-y-0.5 lg:space-y-1">
                    <h1 className="text-xl lg:text-4xl font-black text-[var(--text-main)] tracking-tighter">{t('inventoryMotor')}</h1>
                    <p className="text-[var(--text-muted)] font-black text-[7px] lg:text-[10px] uppercase tracking-[0.15em] lg:tracking-[0.3em]">{t('precisionCatalog')}</p>
                </div>
                <button
                    onClick={() => {
                        setShowForm(true);
                        setIsEditing(false);
                        setEditId(null);
                        setFormData({ name: '', category: 'Smartphones & Tablets', price: '', costPrice: '', stock: '', minStock: '5', image_url: '' });
                    }}
                    className="flex items-center justify-center gap-2 px-6 py-3 lg:py-3 bg-[#FF4700] text-white text-xs lg:text-sm font-bold rounded-xl shadow-glow-orange hover:bg-[#E64000] transition-all active:scale-95 w-full md:w-auto"
                >
                    <Plus className="w-5 h-5" />
                    <span>{isAdmin ? t('addProduct') : 'Solicitar Adição'}</span>
                </button>
            </div>

            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-[var(--bg-panel)] w-full max-w-[95%] sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-[var(--border-subtle)] p-5 md:p-8 shadow-2xl relative animate-in zoom-in-95 slide-in-from-bottom-5 duration-300 custom-scrollbar">
                        {/* Glow effects */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-orange/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2" />

                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-[var(--text-main)] tracking-tight">
                                {isAdmin
                                    ? (isEditing ? t('editProduct') : t('addProduct'))
                                    : (isEditing ? 'Solicitar Edição' : 'Solicitar Adição de Produto')
                                }
                            </h2>
                            <button onClick={() => setShowForm(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1.5 group">
                                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-2 group-focus-within:text-[#FF4700] transition-colors">
                                    <Tag className="w-3 h-3" /> {t('title')}
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ex: iPhone 15 Pro"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-[var(--bg-canvas)] border border-transparent rounded-xl text-sm font-semibold text-[var(--text-main)] focus:outline-none focus:bg-[var(--bg-panel)] focus:border-[#FF4700]/50 focus:shadow-lg transition-all placeholder:text-[var(--text-muted)]"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                    <ImageIcon className="w-3 h-3" /> {t('image')}
                                </label>
                                <ImageUpload
                                    onUpload={(url) => setFormData({ ...formData, image_url: url })}
                                    initialUrl={formData.image_url}
                                    bucket="products"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5 group">
                                    <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-2 group-focus-within:text-[#FF4700] transition-colors">
                                        <Layers className="w-3 h-3" /> {t('qty')}
                                    </label>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        value={formData.stock}
                                        onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                                        className="w-full px-4 py-3 bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl text-sm font-semibold text-[var(--text-main)] focus:outline-none focus:bg-[var(--bg-panel)] focus:border-[#FF4700]/50 transition-all placeholder:text-[var(--text-muted)]"
                                    />
                                </div>

                                <div className="space-y-1.5 group">
                                    <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-2 group-focus-within:text-orange-400 transition-colors">
                                        <AlertTriangle className="w-3 h-3" /> {t('minStock')}
                                    </label>
                                    <input
                                        type="number"
                                        placeholder="5"
                                        value={formData.minStock}
                                        onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                                        className="w-full px-4 py-3 bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl text-sm font-semibold text-[var(--text-main)] focus:outline-none focus:bg-[var(--bg-panel)] focus:border-orange-400/50 transition-all placeholder:text-[var(--text-muted)]"
                                    />
                                </div>

                                <div className="space-y-1.5 group">
                                    <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-2 group-focus-within:text-[#FF4700] transition-colors">
                                        <DollarSign className="w-3 h-3" /> {t('price')} (Venda - MT)
                                    </label>
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                        className="w-full px-4 py-3 bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl text-sm font-semibold text-[var(--text-main)] focus:outline-none focus:bg-[var(--bg-panel)] focus:border-[#FF4700]/50 transition-all placeholder:text-[var(--text-muted)]"
                                    />
                                </div>

                                <div className="space-y-1.5 group">
                                    <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-2 group-focus-within:text-blue-400 transition-colors">
                                        <DollarSign className="w-3 h-3" /> {t('costPrice')} (MT)
                                    </label>
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        value={formData.costPrice}
                                        onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                                        className="w-full px-4 py-3 bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl text-sm font-semibold text-[var(--text-main)] focus:outline-none focus:bg-[var(--bg-panel)] focus:border-blue-400/50 transition-all placeholder:text-[var(--text-muted)]"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 flex items-center justify-end gap-3">
                            <button
                                onClick={() => setShowForm(false)}
                                className="px-5 py-2.5 text-sm font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-canvas)] rounded-xl transition-all"
                            >
                                {t('cancel')}
                            </button>
                            <button
                                onClick={handleSaveProduct}
                                className="px-6 py-2.5 bg-[#FF4700] text-white text-sm font-bold rounded-xl hover:bg-[#E64000] transition-all shadow-glow-orange hover:shadow-[0_0_20px_rgba(255,71,0,0.3)] active:scale-95 flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" /> {isAdmin ? t('save') : 'Enviar Solicitação'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showAdjustModal && selectedProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-[var(--bg-panel)] w-full max-w-[95%] sm:max-w-md max-h-[90vh] overflow-y-auto rounded-3xl p-6 md:p-8 shadow-2xl animate-in zoom-in-95 border border-[var(--border-subtle)] custom-scrollbar">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-[var(--text-main)] tracking-tight">
                                {isQuickSell ? t('quickSell') : t('stockAdjust')}
                            </h2>
                            <button onClick={() => setShowAdjustModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)]">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="p-4 bg-[var(--bg-canvas)] rounded-2xl border border-[var(--border-subtle)] mb-4">
                                <p className="text-xs font-bold text-[var(--text-muted)] uppercase">{t('title')}</p>
                                <p className="text-sm font-black text-[var(--text-main)]">{selectedProduct.name}</p>
                                <p className="text-xs text-[var(--text-muted)] mt-1">{t('currentStock')}: {selectedProduct.stock} un</p>
                            </div>

                            <div className={`grid ${isQuickSell ? 'grid-cols-1' : 'grid-cols-2'} gap-2`}>
                                {!isQuickSell && (
                                    <button
                                        onClick={() => setAdjustData({ ...adjustData, type: 'entry' })}
                                        className={`flex items-center justify-center gap-2 py-4 rounded-2xl font-bold uppercase text-xs tracking-wider transition-all border-2 ${adjustData.type === 'entry' ? 'bg-green-500 text-white border-green-500 shadow-lg' : 'bg-[var(--bg-panel)] text-green-600 border-green-100/50 hover:border-green-300'}`}
                                    >
                                        <ArrowUpRight className="w-4 h-4" /> {t('income')}
                                    </button>
                                )}
                                <button
                                    onClick={() => !isQuickSell && setAdjustData({ ...adjustData, type: 'exit' })}
                                    className={`flex items-center justify-center gap-2 py-4 rounded-2xl font-bold uppercase text-xs tracking-wider transition-all border-2 ${adjustData.type === 'exit' ? (isQuickSell ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-red-500 text-white border-red-500 shadow-lg') : 'bg-[var(--bg-panel)] text-red-600 border-red-100/50 hover:border-red-300'} ${isQuickSell ? 'cursor-default pointer-events-none' : ''}`}
                                >
                                    {isQuickSell ? <ShoppingCart className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                                    {isQuickSell ? t('sell') : t('expense')}
                                </button>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2 block">{t('qty')}</label>
                                <input
                                    type="number"
                                    placeholder="0"
                                    className="w-full px-5 py-4 bg-[var(--bg-canvas)] rounded-2xl border-none focus:ring-2 focus:ring-[#FF4700]/20 font-bold text-xl text-[var(--text-main)]"
                                    value={adjustData.quantity}
                                    onChange={(e) => setAdjustData({ ...adjustData, quantity: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2 block">{t('reason')}</label>
                                <input
                                    type="text"
                                    placeholder={t('reasonPlaceholder')}
                                    className="w-full px-4 py-3 bg-[var(--bg-canvas)] rounded-xl border-none focus:ring-2 focus:ring-[#FF4700]/20 font-medium text-[var(--text-main)] placeholder:text-[var(--text-muted)]"
                                    value={adjustData.reason}
                                    onChange={(e) => setAdjustData({ ...adjustData, reason: e.target.value })}
                                />
                            </div>

                            {!isQuickSell && (
                                <button
                                    onClick={() => setAdjustData({ ...adjustData, isFinancial: !adjustData.isFinancial })}
                                    className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${adjustData.isFinancial ? 'bg-[#FF4700]/5 border-[#FF4700]/30' : 'bg-[var(--bg-panel)] border-[var(--border-subtle)] hover:border-[#FF4700]/30'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl ${adjustData.isFinancial ? 'bg-[#FF4700] text-white' : 'bg-[var(--bg-canvas)] text-[var(--text-muted)]'}`}>
                                            <DollarSign className="w-4 h-4" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[11px] font-black text-[var(--text-main)] uppercase tracking-tight">{t('registerFinance')}</p>
                                            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-tighter">
                                                {adjustData.type === 'entry' ? t('countAsExpense') : t('countAsIncome')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={`w-10 h-5 rounded-full relative transition-colors ${adjustData.isFinancial ? 'bg-[#FF4700]' : 'bg-[var(--border-subtle)]'}`}>
                                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${adjustData.isFinancial ? 'left-6' : 'left-1'}`} />
                                    </div>
                                </button>
                            )}

                            <button
                                onClick={handleAdjustStock}
                                className="w-full py-4 bg-[#FF4700] text-white font-black uppercase text-xs tracking-[0.2em] rounded-2xl shadow-glow-orange hover:bg-[#E64000] transition-all active:scale-95"
                            >
                                {t('confirmMovement')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {confirmQuickSell && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-[var(--bg-panel)] w-full max-w-[95%] sm:max-w-sm rounded-[32px] p-6 md:p-8 shadow-2xl border border-[var(--border-subtle)] animate-in zoom-in-95">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mb-6 text-[#FF4700]">
                                <ShoppingCart className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-black text-[var(--text-main)] mb-2">{t('confirmSell')}</h3>
                            <p className="text-[var(--text-muted)] text-sm font-bold mb-8">
                                {t('sureToSell').replace('{name}', confirmQuickSell.name).replace('{price}', `MT ${confirmQuickSell.price.toLocaleString(locale)}`)}
                            </p>

                            <div className="flex flex-col w-full gap-3">
                                <button
                                    onClick={() => executeQuickSell(confirmQuickSell)}
                                    className="w-full py-4 bg-[#FF4700] text-white font-black uppercase text-xs tracking-[0.2em] rounded-2xl shadow-glow-orange hover:bg-[#E64000] active:scale-95 transition-all"
                                >
                                    {t('yesSellNow')}
                                </button>
                                <button
                                    onClick={() => setConfirmQuickSell(null)}
                                    className="w-full py-4 bg-[var(--bg-canvas)] text-[var(--text-muted)] font-bold uppercase text-xs tracking-[0.2em] rounded-2xl hover:bg-[var(--bg-panel)] transition-all border border-[var(--border-subtle)]"
                                >
                                    {t('cancel')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="relative animate-zoom-fade delay-200">
                <DataTable title={t('assetRegistry')} columns={columns} data={filteredProducts} />
                <div className="absolute inset-0 pointer-events-none border border-white/5 rounded-3xl" />
            </div>
        </div>
    );
}
