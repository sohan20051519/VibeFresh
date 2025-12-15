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
        const { credits } = await this.getCredits(userId);
        return credits >= CREDITS_PER_GENERATION;
    },

    /**
     * Deduct credits for a generation
     * Returns the new credit balance, success status, and any error
     */
    async deductCredits(userId: string): Promise<{ newCredits: number; success: boolean; error?: string }> {
        try {
            // Get current credits from DB
            const { credits: currentCredits } = await this.getCredits(userId);

            console.log('Deducting credits. Current:', currentCredits, 'Cost:', CREDITS_PER_GENERATION);

            if (currentCredits < CREDITS_PER_GENERATION) {
                return { newCredits: currentCredits, success: false, error: 'Not enough credits' };
            }

            const newCredits = currentCredits - CREDITS_PER_GENERATION;

            // Update credits in database
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ credits: newCredits })
                .eq('id', userId);

            if (updateError) {
                console.error('Error updating credits:', updateError);
                return { newCredits: currentCredits, success: false, error: 'Failed to update credits' };
            }

            console.log('Credits deducted successfully. New balance:', newCredits);
            return { newCredits, success: true };
        } catch (err) {
            console.error('Unexpected error deducting credits:', err);
            return { newCredits: 0, success: false, error: 'Unexpected error' };
        }
    },

    /**
     * Get the cost per generation
     */
    getCostPerGeneration(): number {
        return CREDITS_PER_GENERATION;
    }
};
