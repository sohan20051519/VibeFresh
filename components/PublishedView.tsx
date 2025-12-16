import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { projectService } from '../services/projectService';
import { GeneratedPreview } from '../types';
import CodePreview from './CodePreview';

const PublishedView: React.FC = () => {
    const { projectId } = useParams();
    const [preview, setPreview] = useState<GeneratedPreview | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProject = async () => {
            if (!projectId) return;
            try {
                setLoading(true);
                const project = await projectService.getProject(projectId);
                if (project) {
                    setPreview({
                        files: project.files,
                        version: project.timestamp
                    });
                } else {
                    setError("Project not found");
                }
            } catch (err) {
                console.error(err);
                setError("Failed to load project");
            } finally {
                setLoading(false);
            }
        };
        fetchProject();
    }, [projectId]);

    if (loading) {
        return (
            <div className="h-screen w-screen bg-black flex flex-col items-center justify-center text-white gap-4">
                <div className="w-8 h-8 border-4 border-[#57B9FF]/30 border-t-[#57B9FF] rounded-full animate-spin"></div>
                <p className="text-vibe-200">Loading experience...</p>
            </div>
        );
    }

    if (error || !preview) {
        return (
            <div className="h-screen w-screen bg-black flex flex-col items-center justify-center text-white">
                <h1 className="text-2xl font-bold mb-2">404</h1>
                <p className="text-vibe-200">{error || "Project not found"}</p>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-black">
            <CodePreview
                preview={preview}
                isGenerating={false}
                isMobile={false}
                activeTab="preview"
                // Force full screen styling without the toggle capability
                // We pass isFullScreen={false} to suppress the minimize button from CodePreview
                // but we style the container to be full screen (fixed inset-0 above)
                isFullScreen={false}
                isPublished={true}
            />
        </div>
    );
};

export default PublishedView;
