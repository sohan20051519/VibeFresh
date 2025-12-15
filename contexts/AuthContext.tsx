
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { creditsService } from '../services/creditsService';
import { UserProfile } from '../types';

interface AuthContextType {
    user: UserProfile | null;
    loading: boolean;
    signIn: (email: string, pass: string) => Promise<{ error: any }>;
    signUp: (email: string, pass: string, name: string) => Promise<{ error: any }>;
    signOut: () => Promise<void>;
    signInWithGoogle: () => Promise<void>;
    signInWithGithub: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    deductCredits: () => Promise<{ success: boolean; newCredits: number; error?: string }>;
    hasEnoughCredits: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    signIn: async () => ({ error: null }),
    signUp: async () => ({ error: null }),
    signOut: async () => { },
    signInWithGoogle: async () => { },
    signInWithGithub: async () => { },
    refreshProfile: async () => { },
    deductCredits: async () => ({ success: false, newCredits: 0, error: 'Not initialized' }),
    hasEnoughCredits: async () => false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = async (sessionUser: any) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', sessionUser.id)
                .single();

            // Get credits using the service (handles 24h reset)
            const { credits: currentCredits } = await creditsService.getCredits(sessionUser.id);

            if (error) {
                console.warn('Error fetching profile from DB (using metadata fallback):', error);

                // Use metadata from the session user (Identity Provider data)
                const meta = sessionUser.user_metadata || {};
                console.log('Using fallback metadata:', meta);

                setUser({
                    id: sessionUser.id,
                    email: sessionUser.email || '',
                    full_name: meta.full_name || meta.name || sessionUser.email?.split('@')[0] || 'User',
                    avatar_url: meta.avatar_url || meta.picture,
                    credits: currentCredits // Use credits from service (with 24h reset)
                });
            } else {
                // Merge DB profile with Auth session data
                console.log('Profile fetched successfully:', data, 'Credits:', currentCredits);
                setUser({
                    id: data.id,
                    email: sessionUser.email,
                    full_name: data.full_name || sessionUser.user_metadata?.full_name || 'User',
                    avatar_url: data.avatar_url || sessionUser.user_metadata?.avatar_url || sessionUser.user_metadata?.picture,
                    credits: currentCredits // Use credits from service (with 24h reset)
                } as UserProfile);
            }
        } catch (err) {
            console.error('Error in fetchProfile:', err);
        }
    };

    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                fetchProfile(session.user);
            }
            setLoading(false);
        });

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                fetchProfile(session.user);
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signIn = async (email: string, pass: string) => {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password: pass,
        });
        return { error };
    };

    const signUp = async (email: string, pass: string, name: string) => {
        const { error } = await supabase.auth.signUp({
            email,
            password: pass,
            options: {
                data: {
                    full_name: name,
                },
            },
        });
        return { error };
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
    };

    const signInWithGoogle = async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'google',
        });
    };

    const signInWithGithub = async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'github',
        });
    };

    const refreshProfile = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            fetchProfile(session.user);
        }
    }

    const deductCredits = async (): Promise<{ success: boolean; newCredits: number; error?: string }> => {
        if (!user?.id) {
            return { success: false, newCredits: 0, error: 'User not logged in' };
        }

        const result = await creditsService.deductCredits(user.id);

        if (!result.success) {
            return { success: false, newCredits: user.credits || 0, error: result.error || 'Not enough credits' };
        }

        // Update local user state with new credits
        setUser(prev => prev ? { ...prev, credits: result.newCredits } : null);

        return { success: true, newCredits: result.newCredits };
    };

    const hasEnoughCredits = async (): Promise<boolean> => {
        if (!user?.id) return false;

        // Check from local state first for immediate response
        if (user.credits !== undefined && user.credits >= creditsService.getCostPerGeneration()) {
            return true;
        }

        // Fallback to database check
        return await creditsService.hasEnoughCredits(user.id);
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            signIn,
            signUp,
            signOut,
            signInWithGoogle,
            signInWithGithub,
            refreshProfile,
            deductCredits,
            hasEnoughCredits
        }}>
            {children}
        </AuthContext.Provider>
    );
};
