import React from 'react';
import { Activity, X, User as UserIcon, AlertCircle, TrendingUp, ShoppingBag, Settings } from 'lucide-react';

interface Log {
    id: string;
    action: string;
    category: string;
    details: string;
    createdAt: string;
    user: {
        name: string;
        role: string;
        avatar?: string;
    };
}

// This component is now split: logic in a hook/provider, UI in Header.
// For now, I'll export a version that only renders the panel, positioned for the top.

interface LiveActivityPanelProps {
    isOpen: boolean;
    onClose: () => void;
    logs: Log[];
}

export const LiveActivityPanel: React.FC<LiveActivityPanelProps> = ({ isOpen, onClose, logs }) => {
    if (!isOpen) return null;

    const getIcon = (category: string) => {
        switch (category) {
            case 'INVENTORY': return <ShoppingBag className="w-4 h-4 text-blue-400" />;
            case 'FINANCE': return <TrendingUp className="w-4 h-4 text-green-400" />;
            case 'AUTH': return <UserIcon className="w-4 h-4 text-purple-400" />;
            case 'SERVICES': return <Settings className="w-4 h-4 text-orange-400" />;
            default: return <Activity className="w-4 h-4 text-gray-400" />;
        }
    };

    const getActionColor = (category: string, action: string) => {
        if (action.includes('DELETE')) return 'border-red-500/30 bg-red-500/5';
        if (action.includes('CREATE')) return 'border-emerald-500/30 bg-emerald-500/5';
        if (action.includes('UPDATE')) return 'border-blue-500/30 bg-blue-500/5';
        return 'border-zinc-700/50 bg-zinc-800/20';
    };

    return (
        <div className="absolute top-full right-0 mt-3 w-80 md:w-[400px] max-h-[500px] bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-top-4 duration-300 z-[120]">
            <div className="p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <h3 className="text-sm font-black text-[var(--text-main)] uppercase tracking-wider">Monitoramento ao Vivo</h3>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-[var(--bg-canvas)] rounded-lg transition-colors"
                >
                    <X className="w-4 h-4 text-[var(--text-muted)]" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-[var(--text-muted)]">
                        <AlertCircle className="w-8 h-8 opacity-20 mb-2" />
                        <p className="text-xs font-bold uppercase tracking-widest">Sem atividades</p>
                    </div>
                ) : (
                    logs.map((log) => (
                        <div
                            key={log.id}
                            className={`p-3 rounded-xl border transition-all hover:scale-[1.01] ${getActionColor(log.category, log.action)}`}
                        >
                            <div className="flex items-start gap-3">
                                <div className="mt-1">
                                    {getIcon(log.category)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                        <span className="text-xs font-black text-indigo-500 truncate dark:text-indigo-400">
                                            {log.user?.name || 'Sistema'}
                                        </span>
                                        <span className="text-[9px] font-bold text-[var(--text-muted)] whitespace-nowrap">
                                            {new Date(log.createdAt).toLocaleTimeString()}
                                        </span>
                                    </div>
                                    <p className="text-[11px] font-bold text-[var(--text-main)] leading-relaxed break-words">
                                        {log.details}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="p-3 bg-[var(--bg-canvas)] border-t border-[var(--border-subtle)] text-center">
                <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">
                    Log de Fluxo em Tempo Real
                </p>
            </div>
        </div>
    );
};
