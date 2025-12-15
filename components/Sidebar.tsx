import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
    Search,
    Clock,
    Star,
    Trash2,
    BookOpen,
    Plus,
    MoreHorizontal,
    LayoutDashboard,
    Pin,
    PinOff,
    PanelLeftClose,
    PanelLeftOpen,
    LogOut
} from 'lucide-react';
import { HistoryItem } from '../types';

interface SidebarProps {
    history: HistoryItem[];
    onHistoryClick: (item: HistoryItem) => void;
    isMobileOpen?: boolean;
    onCloseMobile?: () => void;
    transparent?: boolean;
    isExpanded?: boolean;
    setIsExpanded?: (expanded: boolean) => void;
    onToggleStar?: (projectId: string, isStarred: boolean) => void;
    onDeleteProject?: (projectId: string) => void;
    user?: any;
    onLogout?: () => void;
    onLogin?: () => void;
}

const ProjectCard = ({
    item,
    onHistoryClick,
    onToggleStar,
    onDeleteProject,
    onMinimize,
}: {
    item: HistoryItem,
    onHistoryClick: (item: HistoryItem) => void,
    onToggleStar?: (projectId: string, isStarred: boolean) => void,
    onDeleteProject?: (projectId: string) => void,
    onMinimize?: () => void,
}) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const formatTimeAgo = (timestamp: number) => {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        if (seconds < 60) return 'Just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d`;
        return new Date(timestamp).toLocaleDateString();
    };

    return (
        <div
            onClick={() => {
                onHistoryClick(item);
                onMinimize?.();
            }}
            className={`group relative p-3 rounded-xl border transition-all duration-300 cursor-pointer animate-in fade-in slide-in-from-left-2
            ${item.is_starred
                    ? 'bg-sky-950/20 border-[#57B9FF]/30 shadow-[0_0_15px_rgba(87,185,255,0.1)]'
                    : 'bg-[#121212] border-white/5 hover:border-[#57B9FF]/30 hover:shadow-lg hover:shadow-[rgba(87,185,255,0.1)]'}
        `}>
            {/* Header: Title & Time */}
            <div className="flex justify-between items-start mb-2">
                <span className={`text-sm font-semibold truncate flex-1 pr-4 transition-colors ${item.is_starred ? 'text-sky-100' : 'text-zinc-300 group-hover:text-sky-50'}`}>
                    {item.prompt || 'Untitled Project'}
                </span>
                <span className="text-[10px] text-zinc-500 whitespace-nowrap pt-0.5">
                    {formatTimeAgo(item.timestamp)}
                </span>
            </div>

            {/* Footer: Icon & Actions */}
            <div className="flex items-center justify-between">
                <div className={`flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-medium 
                    ${item.is_starred ? 'text-[#57B9FF]' : 'text-zinc-500 group-hover:text-[#57B9FF]/80 transition-colors'}`}>
                    {item.is_starred ? (
                        <><Star className="w-3 h-3 fill-[#57B9FF]" /> Pinned</>
                    ) : (
                        <><BookOpen className="w-3 h-3" /> Project</>
                    )}
                </div>

                {/* Action Menu (Visible on Hover/Active) */}
                <div className="relative opacity-0 group-hover:opacity-100 transition-opacity" ref={menuRef}>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsMenuOpen(!isMenuOpen);
                        }}
                        className="p-1 rounded-md hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                    >
                        <MoreHorizontal className="w-4 h-4" />
                    </button>

                    {isMenuOpen && (
                        <div className="absolute right-0 bottom-6 w-40 bg-[#09090b] border border-white/10 rounded-lg shadow-2xl z-[100] overflow-hidden">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleStar?.(item.id, !item.is_starred);
                                    setIsMenuOpen(false);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:text-[#57B9FF] hover:bg-sky-950/30 transition-colors text-left"
                            >
                                {item.is_starred ? (
                                    <><PinOff className="w-3 h-3" /> Unpin</>
                                ) : (
                                    <><Pin className="w-3 h-3" /> Pin</>
                                )}
                            </button>
                            <div className="h-px bg-white/5" />
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm('Delete this project permanently?')) {
                                        onDeleteProject?.(item.id);
                                    }
                                    setIsMenuOpen(false);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30 transition-colors text-left"
                            >
                                <Trash2 className="w-3 h-3" /> Delete
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const Sidebar: React.FC<SidebarProps> = ({
    history,
    onHistoryClick,
    isMobileOpen = false,
    onCloseMobile,
    transparent = false,
    isExpanded = true,
    setIsExpanded = (_) => { },
    onToggleStar,
    onDeleteProject,
    user,
    onLogout,
    onLogin
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const location = useLocation();
    const isLanding = location.pathname === '/';

    const filteredHistory = history.filter(item =>
        (item.prompt || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    const starredProjects = filteredHistory.filter(i => i.is_starred);
    const recentProjects = filteredHistory.filter(i => !i.is_starred);

    return (
        <>
            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-30 md:hidden animate-fade-in"
                    onClick={onCloseMobile}
                />
            )}

            <div
                className={`fixed inset-y-0 left-0 h-full flex flex-col z-[60] border-r border-white/10 bg-black 
                    transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
                    ${isMobileOpen ? 'translate-x-0 shadow-2xl w-72' : '-translate-x-full md:translate-x-0'}
                    ${!isMobileOpen && (isExpanded ? 'md:w-72' : 'md:w-[60px]')} 
                `}
            >
                {/* Header: Logo always visible, text only when expanded or on mobile */}
                <div className={`flex items-center h-16 shrink-0 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${(isExpanded || isMobileOpen) ? 'px-4' : 'w-full px-[8px]'}`}>
                    <button
                        onClick={() => window.location.reload()}
                        className={`flex items-center gap-3 hover:opacity-80 active:scale-95 transition-all ${(isExpanded || isMobileOpen) ? '' : 'ml-auto'}`}
                    >
                        <div className="w-11 h-11 shrink-0 rounded-xl overflow-hidden border border-white/10 shadow-[0_0_15px_rgba(87,185,255,0.3)]">
                            <img
                                src="https://xnlmfbnwyqxownvhsqoz.supabase.co/storage/v1/object/public/files/ChatGPT%20Image%20Nov%2024,%202025,%2010_13_24%20PM.png"
                                alt="VibeFresh Logo"
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <span className={`font-bold text-white text-xl tracking-tight whitespace-nowrap transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden ${(isExpanded || isMobileOpen) ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>
                            VibeFresh
                        </span>
                    </button>
                </div>

                {/* Content Area - Smooth fade transition (always visible on mobile when open) */}
                <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${(isExpanded || isMobileOpen) ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>

                    {/* Primary Actions */}
                    <div className="px-4 pb-4">
                        <button
                            onClick={() => {
                                onHistoryClick({ id: '', prompt: '', timestamp: 0, files: [], messages: [] });
                                setIsExpanded(false);
                            }}
                            className="group w-full flex items-center gap-3 bg-gradient-to-r from-[#57B9FF] to-sky-500 hover:from-sky-500 hover:to-sky-400 text-white transition-all duration-300 font-semibold rounded-xl shadow-[0_4px_20px_rgba(87,185,255,0.2)] hover:shadow-[0_4px_25px_rgba(87,185,255,0.4)] px-4 py-3 active:scale-[0.98]"
                        >
                            <Plus className="w-5 h-5 shrink-0" />
                            <span>New Project</span>
                        </button>
                    </div>

                    {/* Search */}
                    <div className="px-4 pb-2">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-[#57B9FF] transition-colors" />
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-zinc-900/80 text-sm text-white pl-9 pr-3 py-2.5 rounded-xl border border-white/5 focus:border-[#57B9FF]/50 focus:bg-zinc-900 focus:outline-none transition-all placeholder:text-zinc-600"
                            />
                        </div>
                    </div>

                    {/* Separator */}
                    <div className="h-px bg-gradient-to-r from-transparent via-sky-900/30 to-transparent my-2 w-full shrink-0" />

                    {/* Project List */}
                    <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4 custom-scrollbar">
                        {/* Starred Section */}
                        {starredProjects.length > 0 && (
                            <div className="mb-6 relative">
                                <div className="flex items-center justify-between px-1 mb-2 sticky top-0 bg-black/95 backdrop-blur-sm z-10 py-1">
                                    <h3 className="text-[10px] font-bold text-[#57B9FF] uppercase tracking-widest flex items-center gap-2">
                                        <Pin className="w-3 h-3" /> Pinned
                                    </h3>
                                    <span className="text-[10px] text-[#57B9FF]/50 bg-sky-950/10 px-1.5 py-0.5 rounded-full border border-sky-900/20 font-mono">
                                        {starredProjects.length}
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {starredProjects.map(item => (
                                        <ProjectCard
                                            key={item.id}
                                            item={item}
                                            onHistoryClick={onHistoryClick}
                                            onToggleStar={onToggleStar}
                                            onDeleteProject={onDeleteProject}
                                            onMinimize={() => setIsExpanded(false)}
                                        />
                                    ))}
                                </div>
                                <div className="absolute -bottom-3 left-2 right-2 h-px bg-white/5" />
                            </div>
                        )}

                        {/* Recent Section */}
                        <div className="space-y-2">
                            {recentProjects.length > 0 && (
                                <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest px-1 mb-1 mt-2 flex items-center gap-2 sticky top-0 bg-black/95 backdrop-blur-sm z-10 py-1">
                                    <Clock className="w-3 h-3" /> History
                                </h3>
                            )}
                            {recentProjects.map(item => (
                                <ProjectCard
                                    key={item.id}
                                    item={item}
                                    onHistoryClick={onHistoryClick}
                                    onToggleStar={onToggleStar}
                                    onDeleteProject={onDeleteProject}
                                    onMinimize={() => setIsExpanded(false)}
                                />
                            ))}
                        </div>

                        {filteredHistory.length === 0 && (
                            <div className="flex flex-col items-center justify-center text-zinc-700 py-12 gap-3 opacity-60">
                                <LayoutDashboard className="w-8 h-8 opacity-20" />
                                <span className="text-xs font-medium">No projects found</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer: Toggle Button + User Profile (Expanded) */}
                <div className={`border-t border-white/5 shrink-0 bg-[#09090b] transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${(isExpanded || isMobileOpen) ? 'p-4' : 'p-2 flex justify-center'}`}>
                    {(isExpanded || isMobileOpen) ? (
                        <>
                            {user ? (
                                /* Logged In - Show Profile and Logout */
                                <div className="flex flex-col gap-3 w-full">
                                    <div className="flex items-center justify-between w-full">
                                        <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-4 px-2">
                                            <div className="w-10 h-10 shrink-0 rounded-full p-[1px] bg-gradient-to-tr from-[#57B9FF] to-blue-600">
                                                <img
                                                    src={user?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user?.name || user?.email || 'User')}&backgroundColor=0369a1`}
                                                    alt="User"
                                                    className="w-full h-full rounded-full bg-black object-cover border-2 border-black"
                                                />
                                            </div>
                                            <div className="flex flex-col items-start overflow-hidden">
                                                <span className="text-sm font-bold text-white truncate w-full">{user?.name || 'User'}</span>
                                                <span className="text-[10px] text-zinc-500 truncate w-full">{user?.email || ''}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setIsExpanded(false);
                                                onCloseMobile?.();
                                            }}
                                            className="p-2 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-white transition-colors"
                                        >
                                            <PanelLeftClose className="w-5 h-5" />
                                        </button>
                                    </div>
                                    {/* Logout Button */}
                                    <button
                                        onClick={() => onLogout?.()}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20 group"
                                    >
                                        <LogOut className="w-4 h-4 group-hover:text-red-400 transition-colors" />
                                        <span>Sign Out</span>
                                    </button>
                                </div>
                            ) : (
                                /* Logged Out - Show Sign In / Sign Up Buttons */
                                <div className="flex flex-col gap-3 w-full">
                                    <button
                                        onClick={() => onLogin?.()}
                                        className="w-full py-3 rounded-xl bg-gradient-to-r from-[#57B9FF] to-sky-500 hover:from-sky-500 hover:to-sky-400 text-white font-semibold text-sm transition-all shadow-[0_4px_20px_rgba(87,185,255,0.2)] hover:shadow-[0_4px_25px_rgba(87,185,255,0.4)] active:scale-[0.98]"
                                    >
                                        Sign In
                                    </button>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-zinc-500">Don't have an account?</span>
                                        <button
                                            onClick={() => onLogin?.()}
                                            className="text-xs text-[#57B9FF] hover:underline font-medium"
                                        >
                                            Sign Up
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setIsExpanded(false);
                                            onCloseMobile?.();
                                        }}
                                        className="p-2 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-white transition-colors self-end"
                                    >
                                        <PanelLeftClose className="w-5 h-5" />
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        /* Open Button in Minimized mode (Centered) */
                        <button
                            onClick={() => setIsExpanded(true)}
                            className="w-10 h-10 flex justify-center items-center rounded-xl bg-zinc-900 border border-white/10 hover:border-[#57B9FF]/50 hover:text-[#57B9FF] text-zinc-400 transition-all shadow-lg"
                            title="Expand Sidebar"
                        >
                            <PanelLeftOpen className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>
        </>
    );
};

export default Sidebar;
