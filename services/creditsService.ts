import { supabase } from './supabase';

const CREDITS_PER_GENERATION = 25;
const DEFAULT_CREDITS = 100;

export const creditsService = {
    /**
     * Get the current credits for a user
     */
    async getCredits(userId: string): Promise<{ credits: number; wasReset: boolean }> {
        try {
            // Just fetch credits - simple and reliable
            const { data, error } = await supabase
                .from('profiles')
                .select('credits')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('Error fetching credits:', error);
                return { credits: DEFAULT_CREDITS, wasReset: false };
            }

            const currentCredits = data?.credits ?? DEFAULT_CREDITS;
            console.log('Fetched credits from DB:', currentCredits);
            return { credits: currentCredits, wasReset: false };
        } catch (err) {
            console.error('Unexpected error fetching credits:', err);
            return { credits: DEFAULT_CREDITS, wasReset: false };
        }
    },

    /**
     * Check if user has enough credits for a generation
     */
    async hasEnoughCredits(userId: string): Promise<boolean> {
        return true;
    },

    /**
     * Deduct credits for a generation
     * Returns the new credit balance, success status, and any error
     */
    async deductCredits(userId: string): Promise<{ newCredits: number; success: boolean; error?: string }> {
        // Unlimited credits - no deduction
        // Get current credits just to return a valid number, but don't decrement
        const { credits } = await this.getCredits(userId);
        return { newCredits: credits, success: true };
    },

    /**
     * Get the cost per generation
     */
    getCostPerGeneration(): number {
        return CREDITS_PER_GENERATION;
    }
};
