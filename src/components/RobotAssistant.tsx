import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Bot, Sparkles, Package, Wrench, DollarSign } from 'lucide-react';
import { api, socket } from '../lib/api';
import { Product } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';

export default function RobotAssistant() {
    const [isBubbleVisible, setIsBubbleVisible] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [message, setMessage] = useState('');
    const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
    const [pendingServices, setPendingServices] = useState<any[]>([]);
    const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
    const [isManualNotice, setIsManualNotice] = useState(false);
    const isCheckingRef = useRef(false);
    const { t } = useLanguage();

    const showMessage = useCallback((text: string, isUrgent = false) => {
        setIsTyping(true);
        setTimeout(() => {
            setMessage(text);
            setIsTyping(false);
            if (isUrgent || !dismissedIds.has(text)) {
                setIsBubbleVisible(true);
            }
        }, 600);
    }, [dismissedIds]);

    const checkAlerts = useCallback(async (forced = false) => {
        if (isCheckingRef.current && !forced) return;
        isCheckingRef.current = true;

        try {
            const [products, services] = await Promise.all([
                api.products.list(),
                api.services.list()
            ]);

            const lowStock = products.filter((p: Product) => p.stock <= (p.minStock || 0) && p.stock >= 0);
            const urgentServices = services.filter((s: any) =>
                s.status === 'pending' && new Date(s.createdAt) < new Date(Date.now() - 60 * 60 * 1000)
            );

            setLowStockProducts(lowStock);
            setPendingServices(urgentServices);

            if (!isManualNotice) {
                if (urgentServices.length > 0) {
                    const s = urgentServices[0];
                    if (!dismissedIds.has(s.id)) {
                        showMessage(t('pendingServiceAlert').replace('{name}', s.deviceModel), true);
                    }
                } else if (lowStock.length > 0) {
                    const p = lowStock[0];
                    if (!dismissedIds.has(p.id)) {
                        showMessage(t('lowStockAlert').replace('{name}', p.name), true);
                    }
                } else {
                    setMessage(t('robotGreeting'));
                }
            }
        } catch (error) {
            console.error('Robot check error:', error);
        } finally {
            isCheckingRef.current = false;
        }
    }, [t, isManualNotice, dismissedIds, showMessage]);

    useEffect(() => {
        console.log('[Robot] Monitoring Neural Network...');
        checkAlerts();
        const interval = setInterval(checkAlerts, 60000);

        const handleUpdate = (data: any) => {
            console.log('[Robot] Intelligence Link Received Signal:', data);

            let alertMsg = '';
            const type = data.type;
            const action = data.action;

            if (type === 'products') {
                if (action === 'create') alertMsg = "Novo produto detectado no banco de dados. Processando estoque...";
                else if (action === 'update') alertMsg = "Uma atualização de produto foi realizada. Sincronizando catálogo...";
                else alertMsg = "Ajuste de estoque detectado.";
            } else if (type === 'services') {
                if (action === 'create') alertMsg = "Nova Ordem de Serviço aberta. Prioridade sendo calculada...";
                else alertMsg = "Status de serviço modificado. Atualizando painel...";
            } else if (type === 'transactions') {
                alertMsg = "Movimentação financeira registrada. Calculando novo saldo...";
            } else if (type === 'permission-requests') {
                if (action === 'create') alertMsg = "Uma nova solicitação de autorização estratégica acaba de chegar.";
                else alertMsg = "Uma solicitação de permissão foi processada.";
            } else {
                alertMsg = t('robotModificationAlert').replace('{type}', type);
            }

            setIsManualNotice(true);
            showMessage(alertMsg, true);

            setTimeout(() => {
                setIsManualNotice(false);
                checkAlerts(true);
            }, 10000);
        };

        socket.on('data-updated', handleUpdate);
        socket.on('connect', () => {
            console.log('[Robot] Connection Established!');
            showMessage("Conexão estabelecida. Estou monitorando o sistema em tempo real.");
        });

        return () => {
            clearInterval(interval);
            socket.off('data-updated', handleUpdate);
        };
    }, [checkAlerts, t, showMessage]);

    const getIcon = () => {
        if (isTyping) return <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />;
        if (message.includes('estoque') || message.includes('produto')) return <Package className="w-4 h-4 text-orange-400" />;
        if (message.includes('serviço')) return <Wrench className="w-4 h-4 text-blue-400" />;
        if (message.includes('financeiro') || message.includes('saldo')) return <DollarSign className="w-4 h-4 text-emerald-400" />;
        return <Bot className="w-5 h-5 text-[#FF4700]" />;
    };

    return (
        <div className="fixed bottom-6 right-6 lg:bottom-8 lg:right-8 z-[100] animate-in slide-in-from-right-10 duration-500">
            <div className="flex flex-col items-end gap-3 p-2">
                {isBubbleVisible && (
                    <div className="max-w-[200px] lg:max-w-[260px] bg-[var(--bg-panel)] backdrop-blur-2xl border border-[#FF4700]/30 rounded-2xl p-4 lg:p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] pointer-events-auto relative mb-2 animate-in fade-in zoom-in slide-in-from-bottom-5 duration-300">
                        <button
                            onClick={() => {
                                setIsBubbleVisible(false);
                                // Silence current alerts
                                setDismissedIds(prev => {
                                    const next = new Set(prev);
                                    lowStockProducts.forEach(p => next.add(p.id));
                                    pendingServices.forEach(s => next.add(s.id));
                                    next.add(message);
                                    return next;
                                });
                            }}
                            className="absolute top-4 right-4 p-1 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-xl bg-[#FF4700]/10 flex items-center justify-center shrink-0 border border-[#FF4700]/20">
                                {isManualNotice ? <Sparkles className="w-4 h-4 text-[#FF4700] animate-pulse" /> : <Bot className="w-4 h-4 text-[#FF4700]" />}
                            </div>
                            <div className="space-y-1 mt-0.5">
                                <p className="text-[9px] font-black text-[#FF4700] uppercase tracking-[0.25em]">{t('robotTitle')}</p>
                                {isTyping ? (
                                    <div className="flex gap-1 py-1">
                                        <div className="w-1.5 h-1.5 bg-[var(--text-main)]/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                        <div className="w-1.5 h-1.5 bg-[var(--text-main)]/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                        <div className="w-1.5 h-1.5 bg-[var(--text-main)]/40 rounded-full animate-bounce" />
                                    </div>
                                ) : (
                                    <p className="text-[12px] font-bold text-[var(--text-main)] leading-relaxed">
                                        {message}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                <span className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest">Caar Neural Bot</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                {lowStockProducts.length > 0 && <Package className="w-3 h-3 text-orange-500/50" />}
                                {pendingServices.length > 0 && <Wrench className="w-3 h-3 text-blue-500/50" />}
                            </div>
                        </div>

                        <div className="absolute -bottom-2 right-12 w-4 h-4 bg-[var(--bg-panel)] transform rotate-45 border-r border-b border-[#FF4700]/30" />
                    </div>
                )}

                <div
                    className="relative group cursor-pointer animate-float"
                    onClick={() => {
                        setIsBubbleVisible(!isBubbleVisible);
                        if (!isBubbleVisible && message === t('robotGreeting')) {
                            // If just opening and it's default greeting, maybe do a scan
                            checkAlerts(true);
                        }
                    }}
                >
                    <div className="w-11 h-11 lg:w-14 lg:h-14 relative translate-z-0">
                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-1.5 bg-black/50 blur-lg rounded-full scale-x-150 animate-pulse" />

                        <div className={`w-full h-full rounded-2xl transition-all duration-500 shadow-2xl bg-gradient-to-br from-[#131D24] to-[#0A1116] flex items-center justify-center relative border-2 ${isBubbleVisible ? 'border-[#FF4700] ring-4 ring-[#FF4700]/20 rotate-0' : 'border-white/10 group-hover:border-[#FF4700]/50 -rotate-3 hover:rotate-0'
                            }`}>
                            {getIcon()}
                            <div className="absolute inset-0 bg-gradient-to-tr from-[#FF4700]/10 via-transparent to-white/5 rounded-2xl" />
                        </div>

                        {(lowStockProducts.length > 0 || pendingServices.length > 0) && !isBubbleVisible && (
                            <div className="absolute -top-2 -right-2 w-7 h-7 bg-[#FF4700] rounded-xl flex items-center justify-center border-4 border-[#var(--bg-canvas)] shadow-lg animate-bounce">
                                <span className="text-[11px] font-black text-white">{lowStockProducts.length + pendingServices.length}</span>
                            </div>
                        )}

                        <div className="absolute -left-32 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none scale-90 group-hover:scale-100">
                            <div className="bg-[#16222A] text-[#FF4700] text-[10px] font-black px-4 py-2 rounded-xl border border-[#FF4700]/20 uppercase tracking-[0.2em] shadow-2xl whitespace-nowrap">
                                Assistente Neural Online
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
