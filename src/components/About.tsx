import { Info, Cpu, Globe, Terminal, Mail, Phone, Instagram, Download } from 'lucide-react';
import redwallLogo from '../assets/redwall.png';
import { useLanguage } from '../contexts/LanguageContext';
import { usePWA } from '../contexts/PWAContext';


export default function About() {
    const { t } = useLanguage();
    const { installable, installApp } = usePWA();

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex items-center gap-3 lg:gap-4">
                <div className="p-2.5 lg:p-3 bg-[#FF4700]/10 rounded-2xl shadow-glow-orange">
                    <Info className="w-5 h-5 lg:w-6 lg:h-6 text-[#FF4700]" />
                </div>
                <div className="space-y-0.5 lg:space-y-1">
                    <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">{t('aboutTitle')}</h1>
                    <p className="text-slate-500 font-bold uppercase text-[9px] lg:text-[10px] tracking-[0.2em]">{t('aboutSubtitle')}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Credits Section */}
                <div className="bg-white p-10 rounded-[40px] shadow-2xl relative overflow-hidden group border border-slate-100">
                    {/* Background Logo Decoration */}
                    <div className="absolute -bottom-10 -right-10 w-72 h-72 opacity-20 group-hover:opacity-100 transition-all duration-700 -rotate-12 pointer-events-none">
                        <img src={redwallLogo} alt="" className="w-full h-full object-contain" />
                    </div>

                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF4700]/10 rounded-full blur-[120px] opacity-20 -mr-32 -mt-32 transition-all group-hover:opacity-30" />

                    <div className="relative z-10 space-y-6 lg:space-y-8">
                        <div className="flex items-center gap-3 lg:gap-4">
                            <div className="w-12 h-12 lg:w-16 lg:h-16 bg-slate-50 overflow-hidden rounded-2xl flex items-center justify-center p-2 shadow-sm border border-slate-100">
                                <img src={redwallLogo} alt="Redwall Logo" className="w-full h-full object-contain" />
                            </div>
                            <h2 className="text-xl lg:text-2xl font-black text-slate-900">{t('developer')}</h2>
                        </div>

                        <div className="space-y-1 lg:space-y-2">
                            <p className="text-slate-500 font-bold uppercase text-[9px] lg:text-[10px] tracking-widest">{t('developedBy')}</p>
                            <h3 className="text-3xl lg:text-5xl font-black text-[#FF4700] tracking-tighter italic lg:translate-x-[-2px]">Redwall Security</h3>
                        </div>

                        <p className="text-slate-600 text-sm leading-relaxed max-w-md font-medium">
                            {t('redwallDescription')}
                        </p>

                        <div className="pt-6 lg:pt-8 border-t border-slate-100 space-y-4">
                            <div className="flex flex-wrap items-center gap-4 lg:gap-6">
                                <div className="flex items-center gap-2 text-slate-600 text-[10px] lg:text-xs font-bold tracking-tight">
                                    <Mail className="w-4 h-4 text-[#FF4700]" /> sredwall07@gmail.com
                                </div>
                                <div className="flex items-center gap-2 text-slate-600 text-[10px] lg:text-xs font-bold tracking-tight">
                                    <Phone className="w-4 h-4 text-[#FF4700]" /> 874311477 / 834796764
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 lg:gap-6">
                                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-slate-600 text-[10px] lg:text-xs font-bold tracking-tight hover:text-[#FF4700] transition-colors">
                                    <Instagram className="w-4 h-4" /> Instagram
                                </a>
                                <a href="https://www.tiktok.com/@redwall.securitys" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-slate-600 text-[10px] lg:text-xs font-bold tracking-tight hover:text-[#FF4700] transition-colors">
                                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.9-.32-1.9-.23-2.74.12-1.57.71-2.51 2.43-2.27 4.14.15 1.06.72 2.05 1.6 2.59 1.4.88 3.41.76 4.67-.3 1.05-.9 1.52-2.27 1.44-3.64-.02-3.77-.02-7.53-.02-11.3z" />
                                    </svg>
                                    @redwall.securitys
                                </a>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 lg:gap-6 opacity-60">
                                <div className="flex items-center gap-2 text-slate-400 text-[9px] lg:text-[10px] font-black uppercase tracking-widest">
                                    <Globe className="w-3.5 h-3.5 lg:w-4 lg:h-4" /> Global Performance
                                </div>
                                <div className="flex items-center gap-2 text-slate-400 text-[9px] lg:text-[10px] font-black uppercase tracking-widest">
                                    <Terminal className="w-3.5 h-3.5 lg:w-4 lg:h-4" /> clean-code-v1
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* System Info */}
                <div className="space-y-6">
                    <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                            <Cpu className="w-5 h-5 text-slate-400" />
                            <h3 className="text-lg font-black text-slate-900">{t('specifications')}</h3>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('version')}</p>
                                <p className="text-sm font-black text-slate-900">1.0.1 PRO</p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('build')}</p>
                                <p className="text-sm font-black text-slate-900">2026.01.20</p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('status')}</p>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <p className="text-sm font-black text-slate-900">{t('activated')}</p>
                                </div>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('supportLabel')}</p>
                                <p className="text-sm font-black text-slate-900">{t('specialized')}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
                        <h3 className="text-lg font-black text-slate-900 mb-4 tracking-tight">{t('systemNote')}</h3>
                        <p className="text-slate-500 text-sm leading-relaxed font-medium">
                            {t('systemNoteDetail')}
                        </p>
                    </div>
                </div>
            </div>

            {/* PWA Installation Section */}
            <div className="bg-white rounded-[40px] border border-slate-200 shadow-xl overflow-hidden">
                <div className="p-6 lg:p-8 border-b border-slate-100 bg-orange-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 text-orange-600 mb-2">
                            <svg className="w-5 h-5 lg:w-6 lg:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2v8" />
                                <path d="m9 7 3 3 3-3" />
                                <path d="M22 12A10 10 0 1 1 12 2" />
                                <path d="M2 12h10" />
                            </svg>
                            <h3 className="text-lg lg:text-xl font-black tracking-tight">Instalar Aplicativo (PWA)</h3>
                        </div>
                        <p className="text-[11px] lg:text-sm font-bold text-orange-800/60 uppercase tracking-wider">Transforme o sistema em um aplicativo nativo</p>
                    </div>

                    {installable && (
                        <button
                            onClick={installApp}
                            className="flex items-center justify-center gap-2 px-8 py-4 bg-[#FF4700] text-white font-black rounded-2xl shadow-glow-orange hover:bg-[#E64000] hover:scale-105 transition-all active:scale-95 animate-bounce-subtle"
                        >
                            <Download className="w-5 h-5" />
                            INSTALAR AGORA
                        </button>
                    )}
                </div>

                <div className="p-6 lg:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/30">
                    <div className="p-5 lg:p-6 rounded-3xl border border-orange-100 bg-white shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="p-2 bg-orange-100 rounded-xl text-orange-600">
                                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M17.523 15.3414C17.0601 15.3414 16.6853 15.7142 16.6853 16.1746C16.6853 16.635 17.0601 17.0078 17.523 17.0078C17.9859 17.0078 18.3606 16.635 18.3606 16.1746C18.3606 15.7142 17.9859 15.3414 17.523 15.3414ZM6.47702 15.3414C6.0141 15.3414 5.63935 15.7142 5.63935 16.1746C5.63935 16.635 6.0141 17.0078 6.47702 17.0078C6.93994 17.0078 7.31468 16.635 7.31468 16.1746C7.31468 15.7142 6.93994 15.3414 6.47702 15.3414ZM17.8927 10.3204L19.7424 7.13527C19.8398 6.96752 19.7824 6.75611 19.6146 6.65882C19.4468 6.56153 19.2354 6.6189 19.1381 6.78665L17.2584 10.0242C15.7554 9.33748 14.1207 8.94312 12 8.94312C9.87934 8.94312 8.24461 9.33748 6.74159 10.0242L4.8619 6.78665C4.76461 6.6189 4.5532 6.56153 4.38545 6.65882C4.2177 6.75611 4.16033 6.96752 4.25762 7.13527L6.10733 10.3204C2.93721 12.0381 0.778809 15.2253 0.606445 18.9954H23.3936C23.2212 15.2253 21.0628 12.0381 17.8927 10.3204Z" />
                                </svg>
                            </span>
                            <h4 className="text-base lg:text-lg font-black text-slate-900 uppercase">Android (Chrome)</h4>
                        </div>
                        <ul className="text-[11px] lg:text-sm text-slate-600 space-y-2 font-bold uppercase tracking-tight">
                            <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-orange-400" /> 1. Clique nos 3 pontinhos (Menu)</li>
                            <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-orange-400" /> 2. Selecione "Instalar Aplicativo"</li>
                            <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-orange-400" /> 3. O ícone aparecerá na tela inicial</li>
                        </ul>
                    </div>

                    <div className="p-5 lg:p-6 rounded-3xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="p-2 bg-slate-900 rounded-xl text-white">
                                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12.1524 5.91892C11.6669 5.91892 11.1685 5.6158 10.8872 5.27555C10.5936 4.90826 10.3341 4.39893 10.4248 3.86469C10.966 3.84412 11.5037 4.1593 11.7874 4.54226C12.0809 4.93035 12.3168 5.42169 12.1524 5.91892ZM13.8863 12.8719C13.8863 12.8719 13.8863 12.8719 13.8863 12.8719ZM13.8863 12.8719C13.8996 11.033 15.4246 10.3547 15.4419 10.3468C14.5828 9.09104 13.2504 8.94639 12.7937 8.92795C11.5888 8.80544 10.4309 9.6433 9.81844 9.6433C9.20072 9.6433 8.24354 8.93981 7.23455 8.95958C5.90807 8.97935 4.68536 9.73421 4.00282 10.9161C2.62534 13.3039 3.6506 16.8407 4.97851 18.7592C5.62884 19.6973 6.40114 20.7513 7.41165 20.7131C8.38453 20.6736 8.75239 20.086 10.7411 20.086C12.7245 20.086 12.646 20.7131 13.6847 20.7131C14.7387 20.7131 15.3996 19.7829 16.0382 18.8475C16.4891 18.1888 17.5191 16.5936 17.8863 15.0212C16.1438 14.2981 13.8996 14.6548 13.8863 12.8719Z" />
                                </svg>
                            </span>
                            <h4 className="text-base lg:text-lg font-black text-slate-900 uppercase">iOS (Safari)</h4>
                        </div>
                        <ul className="text-[11px] lg:text-sm text-slate-600 space-y-2 font-bold uppercase tracking-tight">
                            <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-slate-400" /> 1. Clique no ícone de Compartilhar</li>
                            <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-slate-400" /> 2. "Adicionar à Tela de Início"</li>
                            <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-slate-400" /> 3. Clique em Adicionar no topo</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
