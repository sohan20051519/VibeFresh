
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';

const JoinPage: React.FC = () => {
    const { search } = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
    const [message, setMessage] = useState('Verifying invitation...');

    useEffect(() => {
        const handleJoin = async () => {
            const params = new URLSearchParams(search);
            const token = params.get('token');

            if (!token) {
                setStatus('error');
                setMessage('Invalid invitation link.');
                return;
            }

            if (!user) {
                // Store invite token in localStorage for post-login
                localStorage.setItem('pending_invite_token', token);
                navigate('/signin?redirect=join'); // Redirect to login, then back to join
                return;
            }

            try {
                const { data, error } = await supabase.rpc('accept_project_invitation', {
                    p_token: token
                });

                if (error) throw error;

                if (data.success) {
                    setStatus('success');
                    setMessage(`Joined project "${data.project_title}" successfully!`);
                    setTimeout(() => {
                        navigate(`/built/${data.project_id}`); // Redirect to the project
                    }, 1500);
                } else {
                    throw new Error(data.error || 'Failed to join');
                }
            } catch (err: any) {
                console.error(err);
                setStatus('error');
                setMessage(err.message || 'Failed to join project');
            }
        };

        if (user) {
            handleJoin();
        } else {
            // Wait for auth check (handled by useEffect dependency)
            // If eventually user is null, the check above handles redirect.
            // But if auth is loading, we wait.
            const params = new URLSearchParams(search);
            const token = params.get('token');
            if (token && !user) {
                localStorage.setItem('pending_invite_token', token);
                navigate('/signin?redirect=join');
            }
        }
    }, [search, user, navigate]);

    return (
        <div className="h-screen w-full bg-black flex items-center justify-center text-white">
            <div className="bg-[#1a1a1a] p-8 rounded-2xl border border-white/10 max-w-md w-full text-center">
                {status === 'verifying' && (
                    <>
                        <div className="w-8 h-8 border-2 border-[#57B9FF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <h2 className="text-xl font-bold mb-2">Joining Project...</h2>
                        <p className="text-white/60">{message}</p>
                    </>
                )}
                {status === 'success' && (
                    <>
                        <div className="text-green-400 text-4xl mb-4">🎉</div>
                        <h2 className="text-xl font-bold mb-2 text-white">Success!</h2>
                        <p className="text-green-300">{message}</p>
                    </>
                )}
                {status === 'error' && (
                    <>
                        <div className="text-red-400 text-4xl mb-4">⚠️</div>
                        <h2 className="text-xl font-bold mb-2 text-white">Error</h2>
                        <p className="text-red-300 mb-4">{message}</p>
                        <button
                            onClick={() => navigate('/')}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
                        >
                            Go Home
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default JoinPage;
