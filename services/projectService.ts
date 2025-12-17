
import { supabase } from './supabase';
import { ProjectFile, HistoryItem } from '../types';

export const projectService = {
    async getUserProjects(userId: string): Promise<HistoryItem[]> {
        // Fetch projects OWNED by the user
        const owned = await supabase
            .from('projects')
            .select('*')
            .eq('user_id', userId);

        // Fetch projects SHARED with the user (via project_members)
        const shared = await supabase
            .from('project_members')
            .select('project:projects(*)') // Use alias project to get the joined data
            .eq('user_id', userId);

        if (owned.error) console.error('Error fetching owned projects:', owned.error);
        if (shared.error) console.error('Error fetching shared projects:', shared.error);

        const ownedProjects = owned.data || [];
        // Extract the actual project data from the nested response
        // Typescript might complain if 'project' is array or object, usually object for many-to-one
        const sharedProjects = (shared.data || [])
            .map((item: any) => item.project)
            .filter((p: any) => p !== null); // Filter out any nulls if join failed

        // Merge and deduplicate (just in case)
        const allProjectsMap = new Map();
        [...ownedProjects, ...sharedProjects].forEach((p: any) => {
            allProjectsMap.set(p.id, p);
        });

        const allProjects = Array.from(allProjectsMap.values());

        // Sort by updated_at desc
        allProjects.sort((a: any, b: any) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );

        return allProjects.map((p: any) => {
            let parsedFiles = p.files;
            if (typeof p.files === 'string') {
                try {
                    parsedFiles = JSON.parse(p.files);
                } catch (e) {
                    console.error("Failed to parse history files:", e);
                    parsedFiles = [];
                }
            }
            return {
                id: p.id,
                prompt: p.prompt,
                timestamp: new Date(p.updated_at).getTime(),
                files: parsedFiles as ProjectFile[],
                messages: p.messages || [],
                is_starred: p.is_starred
            };
        });
    },

    async getProject(projectId: string): Promise<HistoryItem | null> {
        // Use the RPC function to allow public access to single projects (for preview)
        // bypassing strict RLS that protects the main listing.
        const { data, error } = await supabase.rpc('get_project_public', { p_id: projectId });

        if (error) {
            console.error('Error fetching project:', error);
            return null;
        }

        // RPC returns a set/array, check if empty
        if (!data || data.length === 0) return null;

        const projectData = data[0]; // Take first result

        let parsedFiles = projectData.files;
        if (typeof projectData.files === 'string') {
            try {
                parsedFiles = JSON.parse(projectData.files);
            } catch (e) {
                console.error("Failed to parse project files:", e);
                parsedFiles = [];
            }
        }

        return {
            id: projectData.id,
            prompt: projectData.prompt,
            timestamp: new Date(projectData.updated_at).getTime(),
            files: parsedFiles as ProjectFile[],
            messages: projectData.messages || []
        };
    },

    async saveProject(userId: string, prompt: string, files: ProjectFile[], messages: any[], projectId?: string): Promise<HistoryItem | null> {
        const timestamp = new Date().toISOString();

        // Common data
        const contentData = {
            prompt,
            files,
            messages,
            updated_at: timestamp
        };

        let result;

        // Check if we should update or insert
        // Ideally we track the DB ID. If projectId is a UUID, we update. 
        // If it's a timestamp (legacy local storage ID), we insert new.
        // For simplicity, let's upsert if we have a valid UUID, otherwise insert.

        // Simple verification if it's a UUID (very basic)
        const isUuid = projectId && projectId.length > 20 && projectId.includes('-');

        if (isUuid) {
            // UPDATE: Do NOT include user_id to prevent ownership takeover
            // Fetch existing first to check prompt
            const { data: existing } = await supabase.from('projects').select('prompt').eq('id', projectId).single();

            // If existing prompt is long/good, keep it. 
            // If the NEW prompt is short (like "fix bug"), we probably don't want to rename the project to "fix bug".
            // Strategy: ANY update keeps the OLD prompt. Only explicit rename (not implemented here) or First Creation sets prompt.
            // BUT: If the user *wants* to rename by typing "Rename to X", that's different.
            // For now: Keep original prompt if valid.

            let finalPrompt = prompt;
            if (existing && existing.prompt && existing.prompt.length > 0) {
                finalPrompt = existing.prompt;
            }

            const { data, error } = await supabase
                .from('projects')
                .update({ ...contentData, prompt: finalPrompt }) // Use preserved prompt
                .eq('id', projectId)
                .select()
                .single();
            result = { data, error };
        } else {
            // INSERT: Must include user_id
            const { data, error } = await supabase
                .from('projects')
                .insert({ ...contentData, user_id: userId })
                .select()
                .single();
            result = { data, error };
        }

        if (result.error) {
            console.error('Error saving project:', result.error);
            return null;
        }

        const p = result.data;
        return {
            id: p.id,
            prompt: p.prompt,
            timestamp: new Date(p.updated_at).getTime(),
            files: p.files as ProjectFile[],
            messages: p.messages,
            is_starred: p.is_starred
        };
    },

    async toggleStar(projectId: string, isStarred: boolean): Promise<boolean> {
        const { error } = await supabase
            .from('projects')
            .update({ is_starred: isStarred })
            .eq('id', projectId);

        if (error) {
            console.error('Error toggling star:', error);
            return false;
        }
        return true;
    },

    async deleteProject(projectId: string): Promise<boolean> {
        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', projectId);

        if (error) {
            console.error('Error deleting project:', error);
            return false;
        }
        return true;
    }
};
