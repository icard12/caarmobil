import { ShieldAlert } from 'lucide-react';
import { api } from '../lib/api';
import { useNotifications } from '../contexts/NotificationContext';
import { useLanguage } from '../contexts/LanguageContext';

export default function AdminSettings() {
    const { addNotification } = useNotifications();
    const { t } = useLanguage();

    return (
        <div className="space-y-6 lg:space-y-10 animate-in fade-in duration-700 max-w-4xl mx-auto">
            <div className="space-y-2">
                <div className="flex items-center gap-3">
                    <div className="p-2 lg:p-2.5 bg-slate-900 rounded-2xl">
                        <ShieldAlert className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
                    </div>
                    <h2 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">{t('settings')}</h2>
                </div>
                <p className="text-slate-500 font-bold ml-11 lg:ml-14 text-[11px] lg:text-base">Gerenciamento avançado do sistema</p>
            </div>

            <div className="bg-white rounded-[40px] border border-slate-200 shadow-xl overflow-hidden mb-6">
                <div className="p-6 lg:p-8 border-b border-slate-100 bg-blue-50/50">
                    <div className="flex items-center gap-3 text-blue-600 mb-2">
                        <ShieldAlert className="w-5 h-5 lg:w-6 lg:h-6" />
                        <h3 className="text-lg lg:text-xl font-black tracking-tight">Segurança & Backups</h3>
                    </div>
                    <p className="text-[11px] lg:text-sm font-bold text-blue-800/60">Proteja seus dados exportando ou restaurando backups.</p>
                </div>

                <div className="p-6 lg:p-8 space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-5 lg:p-6 rounded-3xl border border-blue-100 bg-blue-50/30">
                        <div>
                            <h4 className="text-base lg:text-lg font-black text-blue-900 mb-1">Exportar Backup Completo</h4>
                            <p className="text-[12px] lg:text-sm text-blue-700/80 font-medium max-w-lg">
                                Baixe um arquivo JSON contendo todos os dados do sistema para segurança offline.
                            </p>
                        </div>
                        <button
                            onClick={async () => {
                                try {
                                    const backupData = await api.admin.getBackup();
                                    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `backup-callmobile-${new Date().toISOString().split('T')[0]}.json`;
                                    a.click();
                                    URL.revokeObjectURL(url);
                                    addNotification('Backup gerado e baixado com sucesso!', 'success');
                                } catch (error) {
                                    addNotification('Erro ao gerar backup', 'error');
                                }
                            }}
                            className="w-full md:w-auto px-6 py-4 lg:py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-lg hover:shadow-blue-200 transition-all active:scale-95 whitespace-nowrap flex items-center justify-center gap-2"
                        >
                            <ShieldAlert className="w-5 h-5" />
                            BAIXAR BACKUP
                        </button>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-5 lg:p-6 rounded-3xl border border-slate-200 bg-slate-50/50">
                        <div>
                            <h4 className="text-base lg:text-lg font-black text-slate-900 mb-1">Restaurar de Backup</h4>
                            <p className="text-[12px] lg:text-sm text-slate-700/80 font-medium max-w-lg">
                                Importe um arquivo de backup anteriormente baixado. <strong>Atenção:</strong> Isso substituirá todos os dados atuais.
                            </p>
                        </div>
                        <label className="w-full md:w-auto px-6 py-4 lg:py-3 bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-600 font-black rounded-xl shadow-sm transition-all active:scale-95 whitespace-nowrap flex items-center justify-center gap-2 cursor-pointer">
                            <ShieldAlert className="w-5 h-5" />
                            RESTAURAR DADOS
                            <input
                                type="file"
                                accept=".json"
                                className="hidden"
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;

                                    const reader = new FileReader();
                                    reader.onload = async (event) => {
                                        try {
                                            const backupData = JSON.parse(event.target?.result as string);
                                            if (!backupData.data) throw new Error('Formato inválido');

                                            if (confirm('ATENÇÃO: Isso apagará todos os dados atuais e restaurará o backup. Deseja continuar?')) {
                                                await api.admin.restoreSystem(backupData.data);
                                                addNotification('Sistema restaurado com sucesso! Reiniciando...', 'success');
                                                setTimeout(() => window.location.reload(), 2000);
                                            }
                                        } catch (error) {
                                            console.error('Restore error:', error);
                                            addNotification('Erro ao processar arquivo de backup', 'error');
                                        }
                                    };
                                    reader.readAsText(file);
                                }}
                            />
                        </label>
                    </div>
                </div>
            </div>

        </div>
    );
}
