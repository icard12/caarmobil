import React, { useState } from 'react';
import { Lock, ArrowRight, Loader2, Mail, Check } from 'lucide-react';
import logo from '../assets/logo.png';
import { useTeam } from '../contexts/TeamContext';
import { ForgotPasswordModal } from './ForgotPasswordModal';

interface LoginProps {
    onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const { setCurrentUser } = useTeam();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [focusedInput, setFocusedInput] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username || !password) return;

        setIsLoading(true);
        setError(null);
        setSuccess(false);

        const isElectron = window.location.protocol === 'file:' || /Electron/.test(navigator.userAgent);
        const loginUrl = isElectron ? 'http://localhost:3000/api/login' : '/api/login';

        try {
            const response = await fetch(loginUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: username, password })
            });

            if (response.ok) {
                const user = await response.json();
                setSuccess(true);
                // Pequeno delay para mostrar a mensagem de sucesso antes de redirecionar
                setTimeout(() => {
                    setCurrentUser(user);
                    onLogin();
                }, 1500);
            } else {
                const errorData = await response.json();
                const errorMessage = errorData.error || 'Credenciais inválidas';
                const detailMessage = errorData.details ? `: ${errorData.details}` : '';
                setError(errorMessage + detailMessage);
            }
        } catch (error) {
            console.error('Login error:', error);
            setError('Erro ao conectar com o servidor. Verifique sua conexão.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-0 sm:p-4 relative overflow-hidden">
            {/* Background Decorations - Hidden or reduced on small mobile for performance */}
            <div className="hidden sm:block absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-[#FF4700]/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="hidden sm:block absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-orange-200/20 rounded-full blur-[100px] pointer-events-none" />

            {/* Grid Pattern */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />

            <div className="w-full sm:max-w-[1000px] min-h-screen sm:min-h-[500px] md:h-[600px] bg-white sm:rounded-[40px] shadow-2xl flex flex-col md:flex-row relative z-10 overflow-hidden animate-zoom-fade mx-auto">
                {/* Left Side - Visual (Hidden on mobile) */}
                <div className="hidden md:flex w-1/2 bg-slate-900 relative items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-[#FF4700]/20 mix-blend-overlay z-10" />
                    <img
                        src="https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=2070"
                        alt="Tech Background"
                        className="absolute inset-0 w-full h-full object-cover opacity-60"
                    />
                    <div className="relative z-20 p-12 text-center w-full">
                        <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-3xl mx-auto mb-8 flex items-center justify-center border border-white/20 shadow-glow-orange">
                            <img src={logo} alt="Logo" className="w-16 h-16 object-contain" />
                        </div>
                        <h2 className="text-4xl font-black text-white mb-4 tracking-tight uppercase">CAAR MOBIL</h2>
                        <p className="text-slate-300 font-medium leading-relaxed">
                            Gestão inteligente e tecnologia avançada para o seu negócio decolar.
                        </p>
                    </div>
                </div>

                {/* Right Side - Form */}
                <div className="w-full md:w-1/2 p-6 sm:p-8 lg:p-16 flex flex-col justify-center relative bg-white/80 backdrop-blur-xl min-h-screen sm:min-h-0">
                    <div className="max-w-sm mx-auto w-full">
                        <div className="mb-6 lg:mb-10 lg:hidden flex flex-col items-center">
                            <div className="w-20 h-20 bg-white rounded-[24px] flex items-center justify-center shadow-lg border border-slate-100 mb-4 animate-float">
                                <img src={logo} alt="Logo" className="w-14 h-14 object-contain" />
                            </div>
                            <h1 className="text-xl font-black text-slate-900 tracking-tighter italic uppercase">CAAR MOBIL</h1>
                        </div>
                        <div className="mb-8 lg:mb-10 text-center md:text-left">
                            <h3 className="text-2xl lg:text-3xl font-black text-slate-900 mb-2 tracking-tight uppercase">Bem-vindo(a)!</h3>
                            <p className="text-slate-500 font-bold text-sm lg:font-medium">Insira seus dados para acessar o painel.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
                            <div className={`group relative transition-all duration-300 ${focusedInput === 'username' ? 'scale-[1.01]' : ''}`}>
                                <label className="text-[10px] font-black text-slate-500 uppercase ml-1 mb-1.5 block tracking-widest">Usuário ou E-mail</label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#FF4700] transition-colors">
                                        <Mail className="w-5 h-5" />
                                    </div>
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        onFocus={() => setFocusedInput('username')}
                                        onBlur={() => setFocusedInput(null)}
                                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-[20px] font-bold text-slate-800 focus:bg-white focus:border-[#FF4700] focus:ring-4 focus:ring-[#FF4700]/10 transition-all outline-none placeholder:text-slate-300 text-base"
                                        placeholder="nome@exemplo.com"
                                    />
                                </div>
                            </div>

                            <div className={`group relative transition-all duration-300 ${focusedInput === 'password' ? 'scale-[1.01]' : ''}`}>
                                <label className="text-[10px] font-black text-slate-500 uppercase ml-1 mb-1.5 block tracking-widest">Senha secreta</label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#FF4700] transition-colors">
                                        <Lock className="w-5 h-5" />
                                    </div>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        onFocus={() => setFocusedInput('password')}
                                        onBlur={() => setFocusedInput(null)}
                                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-[20px] font-bold text-slate-800 focus:bg-white focus:border-[#FF4700] focus:ring-4 focus:ring-[#FF4700]/10 transition-all outline-none placeholder:text-slate-300 text-base"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between px-1">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <div className="relative flex items-center justify-center">
                                        <input type="checkbox" className="peer w-5 h-5 rounded-lg border-2 border-slate-200 text-[#FF4700] focus:ring-[#FF4700] transition-all cursor-pointer appearance-none checked:bg-[#FF4700] checked:border-[#FF4700]" />
                                        <Check className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" strokeWidth={4} />
                                    </div>
                                    <span className="text-sm font-bold text-slate-500 group-hover:text-slate-700 transition-colors">Lembrar-me</span>
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setShowForgotModal(true)}
                                    className="text-sm font-bold text-[#FF4700] hover:text-[#E64000] hover:underline transition-colors focus:outline-none"
                                >
                                    Esqueci a senha
                                </button>
                            </div>

                            {/* Mensagens de Feedback */}
                            {error && (
                                <div className="bg-red-50 border-2 border-red-100 p-4 rounded-[20px] flex items-center gap-3 animate-shake">
                                    <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center shrink-0">
                                        <Lock className="w-4 h-4 text-white" />
                                    </div>
                                    <p className="text-sm font-bold text-red-600">{error}</p>
                                </div>
                            )}

                            {success && (
                                <div className="bg-emerald-50 border-2 border-emerald-100 p-4 rounded-[20px] flex items-center gap-3 animate-zoom-fade">
                                    <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                                        <Check className="w-4 h-4 text-white" />
                                    </div>
                                    <p className="text-sm font-bold text-emerald-600">Acesso autorizado! Entrando...</p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading || success}
                                className="w-full py-4.5 bg-[#FF4700] hover:bg-[#E64000] text-white font-black rounded-[22px] shadow-glow-orange transition-all transform active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed group relative overflow-hidden text-base h-[56px]"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Entrando no Sistema...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>ACESSAR SISTEMA</span>
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Mobile Footer Inside Form for small screens */}
                    <div className="mt-auto pt-8 text-center sm:hidden">
                        <p className="text-slate-400 text-[10px] font-black tracking-[0.2em] uppercase opacity-60">
                            &copy; 2024 CAAR MOBIL SISTEMA
                        </p>
                    </div>
                </div>
            </div>

            <p className="hidden sm:block absolute bottom-4 lg:bottom-6 text-slate-400 text-[10px] lg:text-xs font-black lg:font-bold tracking-widest uppercase">
                &copy; 2024 CAAR MOBIL SISTEMA
            </p>
            <ForgotPasswordModal
                isOpen={showForgotModal}
                onClose={() => setShowForgotModal(false)}
            />
        </div>

    );
}

export default Login;
