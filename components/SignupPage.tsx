
import React, { useState, useEffect, useRef } from 'react';
import { LucideLock, LucideUser, LucideArrowRight, LucideGithub, LucideMail } from 'lucide-react';
import GlassCard from './GlassCard';
import { useAuth } from '../contexts/AuthContext';

interface SignupPageProps {
    onSignup: () => void;
    onGoToLogin: () => void;
}

const SignupPage: React.FC<SignupPageProps> = ({ onSignup, onGoToLogin }) => {
    const { signUp, signInWithGoogle, signInWithGithub } = useAuth();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const cardRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [showConfirmation, setShowConfirmation] = useState(false);

    // Parallax / 3D Tilt Effect
    useEffect(() => {
        const card = cardRef.current;
        const container = containerRef.current;
        if (!card || !container) return;

        const handleMouseMove = (e: MouseEvent) => {
            const { left, top, width, height } = container.getBoundingClientRect();
            const x = (e.clientX - left - width / 2) / 25;
            const y = (e.clientY - top - height / 2) / 25;

            card.style.transform = `rotateY(${x}deg) rotateX(${-y}deg)`;
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

    const validateEmail = (email: string) => {
        const domain = email.split('@')[1];
        return ALLOWED_DOMAINS.includes(domain?.toLowerCase());
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!validateEmail(email)) {
            setError('Please use a top-tier email provider (Gmail, Yahoo, Hotmail, etc).');
            return;
        }

        setIsLoading(true);
        const { error: signUpError } = await signUp(email, password, name);
        setIsLoading(false);

        if (signUpError) {
            setError(signUpError.message);
        } else {
            setShowConfirmation(true);
            // We do NOT call onSignup() immediately. We wait for user to confirm the dialog.
        }
    };

    return (
        <div
            ref={containerRef}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden perspective-1000"
        >
            {/* Dynamic Background Elements specific to Signup */}


            <div
                ref={cardRef}
                className="transition-transform duration-200 ease-out preserve-3d"
                style={{ transformStyle: 'preserve-3d' }}
            >
                {showConfirmation ? (
                    <GlassCard variant="liquid" className="w-[400px] p-8 backdrop-blur-3xl border-opacity-50 relative overflow-hidden text-center animate-in fade-in zoom-in-95">
                        <div className="flex flex-col items-center space-y-4">
                            <div className="p-4 rounded-full bg-green-500/20 border border-green-500/30 text-green-400 mb-2">
                                <LucideMail className="w-8 h-8" />
                            </div>
                            <h2 className="text-2xl font-bold text-white">Check your Inbox</h2>
                            <p className="text-vibe-200">
                                We've sent a confirmation link to <strong>{email}</strong>.
                                Please verify your email to activate your account.
                            </p>
                            <button
                                onClick={() => {
                                    setShowConfirmation(false);
                                    onGoToLogin(); // Redirect to login instead of auto-logging in if confirmation is required
                                }}
                                className="mt-6 w-full py-3 rounded-xl bg-white text-black font-bold hover:bg-white/90 transition-all"
                            >
                                Got it, take me to Login
                            </button>
                        </div>
                    </GlassCard>
                ) : (
                    <GlassCard variant="liquid" className="w-[400px] p-8 backdrop-blur-3xl border-opacity-50 relative overflow-hidden group">

                        {/* Decorative shine */}
                        <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 group-hover:animate-shine" />

                        <div className="flex flex-col items-center mb-8 space-y-2">
                            <div className="p-3 rounded-full bg-white/5 border border-white/10 shadow-inner mb-4 animate-bounce-slow">
                                <LucideUser className="w-8 h-8 text-white/80" />
                            </div>
                            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-white/80 to-white/60">
                                Create Account
                            </h1>
                            <p className="text-sm text-vibe-200">Join VibeFresh and start building today</p>
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
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-3 border border-white/10 rounded-xl bg-black/20 text-white placeholder-vibe-200 focus:outline-none focus:ring-2 focus:ring-white/20 focus:bg-black/30 transition-all duration-300"
                                        placeholder="Full Name"
                                        required
                                    />
                                </div>

                                <div className="relative group/input">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <LucideMail className="h-5 w-5 text-vibe-200 group-focus-within/input:text-white transition-colors" />
                                    </div>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-3 border border-white/10 rounded-xl bg-black/20 text-white placeholder-vibe-200 focus:outline-none focus:ring-2 focus:ring-white/20 focus:bg-black/30 transition-all duration-300"
                                        placeholder="Email Address"
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

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full flex items-center justify-center space-x-2 py-3.5 px-4 border border-transparent rounded-xl text-sm font-bold text-black bg-white hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-white shadow-lg hover:shadow-white/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group/btn"
                            >
                                <span className={isLoading ? 'animate-pulse' : ''}>
                                    {isLoading ? 'Creating Account...' : 'Sign Up'}
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
                                <span className="text-vibe-200">Already have an account? </span>
                                <button
                                    type="button"
                                    onClick={onGoToLogin}
                                    className="font-bold text-white hover:text-blue-400 hover:underline transition-all"
                                >
                                    Sign in
                                </button>
                            </div>
                        </form>
                    </GlassCard>
                )}
            </div>
        </div>
    );
};

export default SignupPage;
