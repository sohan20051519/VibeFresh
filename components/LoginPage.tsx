import React, { useState, useEffect, useRef } from 'react';
import { LucideLock, LucideUser, LucideArrowRight, LucideGithub, ArrowLeft } from 'lucide-react';
import GlassCard from './GlassCard';
import { useAuth } from '../contexts/AuthContext';

interface LoginPageProps {
    onLogin: () => void;
    onGoToSignup?: () => void;
    onBack?: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onGoToSignup, onBack }) => {
    const { signIn, signInWithGoogle, signInWithGithub } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const cardRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Parallax / 3D Tilt Effect
    useEffect(() => {
        const card = cardRef.current;
        const container = containerRef.current;
        if (!card || !container) return;

        const handleMouseMove = (e: MouseEvent) => {
            const { left, top, width, height } = container.getBoundingClientRect();
            const x = (e.clientX - left - width / 2) / 25;
            const y = (e.clientY - top - height / 2) / 25;

            card.style.transform = `rotateY(${x}deg) rotateX(${- y}deg)`;
        };

        const handleMouseLeave = () => {
            card.style.transform = `rotateY(0deg) rotateX(0deg)`;
        };

        container.addEventListener('mousemove', handleMouseMove);
        container.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            container.removeEventListener('mousemove', handleMouseMove);
            container.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, []);

    const ALLOWED_DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'];

    const validateEmail = (input: string) => {
        // If it looks like an email (intersects with @), check domain
        if (input.includes('@')) {
            const domain = input.split('@')[1];
            return ALLOWED_DOMAINS.includes(domain?.toLowerCase());
        }
        // If it's a username (no @), we might want to allow it or assume it's linked to a valid email
        // For strictness, let's assume input MUST be an email if we enforce domains strictly.
        // But user provided code uses "username" state. Supabase usually takes email.
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Optional: Enforce email domain on login too? 
        // "and only accpect top tier mail domain for signup and signin's"
        if (username.includes('@') && !validateEmail(username)) {
            setError('Please use a top-tier email provider (Gmail, Yahoo, Hotmail, etc).');
            return;
        }

        setIsLoading(true);
        const { error: signInError } = await signIn(username, password);
        setIsLoading(false);

        if (signInError) {
            setError(signInError.message);
        } else {
            onLogin();
        }
    };

    return (
        <div
            ref={containerRef}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden perspective-1000"
        >
            {/* Back Button */}
            {onBack && (
                <button
                    onClick={onBack}
                    className="absolute top-6 left-6 p-3 rounded-full bg-white/5 hover:bg-white/20 text-white transition-all border border-white/10 z-50 group backdrop-blur-md hover:scale-110"
                    title="Back to Home"
                >
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                </button>
            )}

            {/* Dynamic Background Elements */}


            <div
                ref={cardRef}
                className="transition-transform duration-200 ease-out preserve-3d"
                style={{ transformStyle: 'preserve-3d' }}
            >
                <GlassCard variant="liquid" className="w-[400px] p-8 backdrop-blur-3xl border-opacity-50 relative overflow-hidden group">

                    {/* Decorative shine */}
                    <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 group-hover:animate-shine" />

                    <div className="flex flex-col items-center mb-6 space-y-2">
                        <div className="p-3 rounded-full bg-white/5 border border-white/10 shadow-inner mb-2 animate-bounce-slow">
                            <LucideLock className="w-8 h-8 text-white/80" />
                        </div>
                        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-white/80 to-white/60">
                            Welcome Back
                        </h1>
                        <p className="text-sm text-vibe-200">Enter your credentials to access your workspace</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-200 text-xs text-center animate-in fade-in slide-in-from-top-2">
                                {error}
                            </div>
                        )}
                        <div className="space-y-4">
                            <div className="relative group/input">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <LucideUser className="h-5 w-5 text-vibe-200 group-focus-within/input:text-white transition-colors" />
                                </div>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-3 border border-white/10 rounded-xl bg-black/20 text-white placeholder-vibe-200 focus:outline-none focus:ring-2 focus:ring-white/20 focus:bg-black/30 transition-all duration-300"
                                    placeholder="Username or Email"
                                    required
                                />
                            </div>

                            <div className="relative group/input">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <LucideLock className="h-5 w-5 text-vibe-200 group-focus-within/input:text-white transition-colors" />
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-3 border border-white/10 rounded-xl bg-black/20 text-white placeholder-vibe-200 focus:outline-none focus:ring-2 focus:ring-white/20 focus:bg-black/30 transition-all duration-300"
                                    placeholder="Password"
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center">
                                <input id="remember-me" name="remember-me" type="checkbox" className="h-4 w-4 rounded border-gray-600 bg-white/10 focus:ring-offset-gray-900" />
                                <label htmlFor="remember-me" className="ml-2 block text-vibe-200">Remember me</label>
                            </div>
                            <div className="text-sm">
                                <a href="#" className="font-medium text-vibe-200 hover:text-white transition-colors">Forgot password?</a>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex items-center justify-center space-x-2 py-3.5 px-4 border border-transparent rounded-xl text-sm font-bold text-black bg-white hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-white shadow-lg hover:shadow-white/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group/btn"
                        >
                            <span className={isLoading ? 'animate-pulse' : ''}>
                                {isLoading ? 'Signing In...' : 'Sign In'}
                            </span>
                            {!isLoading && (
                                <LucideArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                            )}
                        </button>

                        <div className="relative my-4">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-white/10"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-transparent text-vibe-200">Or continue with</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={signInWithGithub}
                                className="flex items-center justify-center py-2.5 px-4 border border-white/10 rounded-xl bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all duration-300 group/social"
                            >
                                <LucideGithub className="w-5 h-5 text-white group-hover/social:scale-110 transition-transform" />
                            </button>
                            <button
                                type="button"
                                onClick={signInWithGoogle}
                                className="flex items-center justify-center py-2.5 px-4 border border-white/10 rounded-xl bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all duration-300 group/social"
                            >
                                <svg className="w-5 h-5 text-white group-hover/social:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 0.587 5.387 0 12s5.867 12 12.48 12c3.6 0 6.613-1.2 8.413-4.107 1.253-2.013 1.547-5.12 1.547-6.973 0-1.253-.133-2.48-.32-3.653h-9.647z" />
                                </svg>
                            </button>
                        </div>

                        <div className="mt-6 text-center text-sm">
                            <span className="text-vibe-200">Don't have an account? </span>
                            <button type="button" onClick={onGoToSignup} className="font-bold text-white hover:text-blue-400 hover:underline transition-all">Sign up</button>
                        </div>
                    </form>
                </GlassCard>
            </div>
        </div>
    );
};

export default LoginPage;
