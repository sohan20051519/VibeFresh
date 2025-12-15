import React, { useState, useEffect } from 'react';
import { AppState, GeneratedPreview } from '../types';
import { Layout, Github, Twitter, ArrowLeft, Download, Menu, User, LogOut, CreditCard, Code2, Eye, Smartphone, Tablet, Monitor, Maximize2, Minimize2, UserPlus, Globe, Copy, Check, X, RotateCw } from 'lucide-react';
import JSZip from 'jszip';
import emailjs from '@emailjs/browser';
import { supabase } from '../services/supabase';

interface NavbarProps {
  setAppState: (state: AppState) => void;
  appState: AppState;
  preview: GeneratedPreview | null;
  onToggleSidebar: () => void;
  isLoggedIn: boolean;
  user: any; // Using explicit type would be better but keeping simple for now
  onLogin: () => void;
  onLogout: () => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  mobileView?: 'chat' | 'preview';
  setMobileView?: (view: 'chat' | 'preview') => void;
  isMobileSidebarOpen: boolean;
  activeCodeTab?: 'preview' | 'code';
  setActiveCodeTab?: (tab: 'preview' | 'code') => void;
  previewViewport?: 'mobile' | 'tablet' | 'desktop';
  setPreviewViewport?: (viewport: 'mobile' | 'tablet' | 'desktop') => void;
  isSidebarExpanded?: boolean;
  isPreviewFullScreen?: boolean;
  setIsPreviewFullScreen?: (isFullScreen: boolean) => void;
  activeProjectTitle?: string;
  activeProjectId?: string;
  onExitWorkspace?: () => void;
  isGenerating?: boolean; // Added prop
  onRefreshPreview?: () => void; // Added prop
}

const Navbar: React.FC<NavbarProps> = ({
  setAppState,
  appState,
  preview,
  onToggleSidebar,
  isLoggedIn,
  user,
  onLogin,
  onLogout,
  isMobileSidebarOpen,
  activeCodeTab,
  setActiveCodeTab,
  previewViewport,
  setPreviewViewport,
  isSidebarExpanded,
  isPreviewFullScreen,
  setIsPreviewFullScreen,
  activeProjectTitle,
  activeProjectId,
  onExitWorkspace,
  isGenerating = false,
  onRefreshPreview
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isLogoHovered, setIsLogoHovered] = useState(false);

  // Share / Publish State
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor'); // 'editor' | 'viewer'
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [isLoadingCollaborators, setIsLoadingCollaborators] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [inviteStatus, setInviteStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });
  const [isCopied, setIsCopied] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState('');

  // Fetch collaborators when dialog opens
  useEffect(() => {
    if (showShareDialog && activeProjectId) {
      fetchCollaborators();
    }
  }, [showShareDialog, activeProjectId]);

  const fetchCollaborators = async () => {
    setIsLoadingCollaborators(true);
    try {
      const { data, error } = await supabase.rpc('get_project_collaborators', {
        p_project_id: activeProjectId
      });
      if (error) console.error(error);
      if (data) setCollaborators(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingCollaborators(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return; // Should be logged in

    try {
      setInviteStatus({ type: null, message: '' }); // Reset status
      const { data, error } = await supabase.rpc('invite_user_to_project', {
        p_email: inviteEmail,
        p_project_id: activeProjectId,
        p_role: inviteRole,
        p_base_url: window.location.origin // Dynamic base URL (localhost or prod)
      });

      if (error) throw error;

      if (data) {
        if (data.error) {
          setInviteStatus({ type: 'error', message: data.error });
        } else {
          if (data.status === 'invited') {
            setInviteLink(data.invite_link);
            setInviteStatus({ type: 'success', message: 'Invitation link generated!' });

            // SEND EMAIL VIA EMAILJS
            if (data.invite_link) {
              try {
                await emailjs.send(
                  'service_vibefresh', // Replace with your Service ID
                  'template_vibefresh_invite', // Replace with your Template ID
                  {
                    to_email: inviteEmail,
                    invite_link: data.invite_link,
                    project_name: activeProjectTitle || 'a project',
                    inviter_name: user.name || user.email
                  },
                  'YOUR_PUBLIC_KEY' // Replace with your Public Key
                );
                setInviteStatus(prev => ({ type: 'success', message: (prev.message || '') + ' Email sent!' }));
              } catch (emailErr) {
                console.error("EmailJS Error:", emailErr);
                // Fallback: Copy to clipboard
                navigator.clipboard.writeText(data.invite_link);
                setInviteStatus({ type: 'success', message: 'Email service skipped. Link copied to clipboard!' });
              }
            }

          } else {
            setInviteStatus({ type: 'success', message: data.message });
          }
          setInviteEmail('');
          fetchCollaborators(); // Refresh list
        }
      }
    } catch (err: any) {
      console.error("Invitation failed:", err);
      setInviteStatus({ type: 'error', message: err.message || "Failed to send invitation" });
    }
  };

  const removeMember = async (id: string, type: string) => {
    if (!confirm("Are you sure you want to remove this person?")) return;
    try {
      await supabase.rpc('manage_project_member', {
        p_project_id: activeProjectId,
        p_member_id: id,
        p_action: 'remove',
        p_type: type
      });
      fetchCollaborators();
    } catch (err) {
      alert("Failed to remove member");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handlePublish = () => {
    setIsPublishing(true);
    // Simulate API call
    setTimeout(() => {
      setIsPublishing(false);
      setPublishedUrl(`https://vibefresh.app/p/${activeProjectId || 'demo'}`);
    }, 1500);
  };

  const handleDownload = async () => {
    if (!preview?.files) return;

    // Prompt for filename
    const filename = window.prompt("Enter a name for your project:", "my-vibe-project");
    if (!filename) return; // Cancelled

    const safeFilename = filename.replace(/[^a-z0-9-_]/gi, '-').toLowerCase() || "project";

    const zip = new JSZip();
    preview.files.forEach(file => {
      zip.file(file.name, file.content);
    });

    const content = await zip.generateAsync({ type: "blob" });
    const url = window.URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeFilename}.zip`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <nav className={`h-16 fixed md:absolute top-0 left-0 w-full z-50 flex items-center ${appState === AppState.WORKSPACE ? 'justify-end' : 'justify-between'} px-4 md:px-8 transition-all duration-300 border-b border-white/5 ${appState === AppState.WORKSPACE ? 'bg-black/80 backdrop-blur-md' : 'bg-transparent backdrop-blur-sm'}`}>

      {/* Centered Workspace Controls (Desktop) */}
      {appState === AppState.WORKSPACE && (
        <div className="absolute left-1/2 transform -translate-x-1/2 hidden md:flex items-center gap-4 transition-all duration-300">
          {/* Code / Preview Toggles */}
          <div className="flex bg-black/40 rounded-lg p-1 border border-white/5 backdrop-blur-sm">
            <button
              onClick={() => setActiveCodeTab?.('code')}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${activeCodeTab === 'code' ? 'bg-[#57B9FF]/10 text-[#57B9FF] border border-[#57B9FF]/20 shadow-[0_0_10px_rgba(87,185,255,0.1)]' : 'text-vibe-200 hover:text-white'}`}
            >
              <Code2 className="w-3.5 h-3.5" /> Code
            </button>
            <button
              onClick={() => setActiveCodeTab?.('preview')}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${activeCodeTab === 'preview' ? 'bg-[#57B9FF]/10 text-[#57B9FF] border border-[#57B9FF]/20 shadow-[0_0_10px_rgba(87,185,255,0.1)]' : 'text-vibe-200 hover:text-white'}`}
            >
              <Eye className="w-3.5 h-3.5" /> Preview
            </button>
          </div>

          {/* Viewport Toggles - Only show in Preview mode */}
          {activeCodeTab === 'preview' && (
            <div className="flex bg-black/40 rounded-lg p-1 border border-white/5 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
              <button onClick={() => setPreviewViewport?.('mobile')} className={`p-1.5 rounded hover:bg-white/10 transition-colors ${previewViewport === 'mobile' ? 'text-[#57B9FF] bg-[#57B9FF]/10' : 'text-vibe-200'}`} title="Mobile"><Smartphone className="w-4 h-4" /></button>
              <button onClick={() => setPreviewViewport?.('tablet')} className={`p-1.5 rounded hover:bg-white/10 transition-colors ${previewViewport === 'tablet' ? 'text-[#57B9FF] bg-[#57B9FF]/10' : 'text-vibe-200'}`} title="Tablet"><Tablet className="w-4 h-4" /></button>
              <button onClick={() => setPreviewViewport?.('desktop')} className={`p-1.5 rounded hover:bg-white/10 transition-colors ${previewViewport === 'desktop' ? 'text-[#57B9FF] bg-[#57B9FF]/10' : 'text-vibe-200'}`} title="Desktop"><Monitor className="w-4 h-4" /></button>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-6">
        {/* Mobile Logo / Sidebar Toggle - Hidden if Sidebar is Open */}
        <div className={`flex items-center gap-3 md:hidden transition-opacity duration-300 ${isMobileSidebarOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <button
            onClick={onToggleSidebar}
            onMouseEnter={() => setIsLogoHovered(true)}
            onMouseLeave={() => setIsLogoHovered(false)}
            className="w-10 h-10 rounded-xl bg-black border border-white/10 flex items-center justify-center transition-all shadow-lg hover:scale-105 active:scale-95 overflow-hidden"
          >
            {isLogoHovered ? (
              <Menu className="w-6 h-6 text-white animate-pulse" />
            ) : (
              <img
                src="https://xnlmfbnwyqxownvhsqoz.supabase.co/storage/v1/object/public/files/ChatGPT%20Image%20Nov%2024,%202025,%2010_13_24%20PM.png"
                alt="VibeFresh Logo"
                className="w-full h-full object-cover"
              />
            )}
          </button>

          <button
            onClick={() => window.location.reload()}
            className="font-bold text-xl tracking-tight text-white hidden sm:block md:hidden hover:text-blue-400 transition-colors"
          >
            VibeFresh
          </button>
        </div>


        {/* Desktop VibeFresh Text Only - Positioned right next to sidebar logo when minimized */}
        {!isSidebarExpanded && (
          <button
            onClick={() => window.location.reload()}
            className="hidden md:flex items-center h-16 -ml-6 transition-all duration-500 hover:opacity-80 active:scale-95"
          >
            <span className="font-bold text-white tracking-tight text-xl">VibeFresh</span>
          </button>
        )}

        {appState === AppState.WORKSPACE && (
          <button
            onClick={() => onExitWorkspace?.()}
            className="p-2 rounded-xl hover:bg-white/10 text-vibe-200 hover:text-white transition-colors hidden md:block"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}

        {appState === AppState.WORKSPACE && (
          <div className="hidden sm:flex items-center gap-3 pl-4 border-l border-white/10 max-w-[200px] md:max-w-[400px]">
            <span className="text-sm font-medium text-white group-hover:text-[#57B9FF] transition-colors cursor-default truncate">
              {activeProjectTitle || 'Untitled Project'}
            </span>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex-shrink-0 transition-colors ${isGenerating
              ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 shadow-[0_0_10px_rgba(234,179,8,0.1)]'
              : 'bg-[#57B9FF]/10 text-[#57B9FF] border border-[#57B9FF]/20 shadow-[0_0_10px_rgba(87,185,255,0.1)]'
              }`}>
              {activeProjectTitle ? (isGenerating ? 'SAVING...' : 'SAVED') : (isGenerating ? 'CREATING...' : 'DRAFT')}
            </span>

            {/* Desktop Rollback Button Removed */}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 md:gap-3 flex-shrink-0 ml-auto">
        {/* Workspace Action Buttons - All grouped on the right */}
        {appState === AppState.WORKSPACE && (
          <div className="flex items-center gap-2 md:gap-3">
            {/* Refresh Preview */}
            <button
              onClick={() => onRefreshPreview?.()}
              className="p-2 rounded-xl text-vibe-200 hover:bg-white/10 hover:text-white transition-all flex"
              title="Refresh Preview"
            >
              <RotateCw className="w-5 h-5" />
            </button>

            {/* Full Screen Toggle */}
            <button
              onClick={() => setIsPreviewFullScreen?.(!isPreviewFullScreen)}
              className={`p-2 rounded-xl text-vibe-200 hover:bg-white/10 hover:text-white transition-all flex ${isPreviewFullScreen ? 'text-[#57B9FF] bg-[#57B9FF]/10' : ''}`}
              title={isPreviewFullScreen ? "Exit Full Screen" : "Enter Full Screen"}
            >
              {isPreviewFullScreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>

            {/* Export Button */}
            {preview && (
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-[#57B9FF]/10 text-[#57B9FF] hover:bg-[#57B9FF]/20 transition-all border border-[#57B9FF]/20 shadow-[0_0_10px_rgba(87,185,255,0.1)]"
                title="Download Zip"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
              </button>
            )}

            {/* Publish Button */}
            <button
              disabled
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-600/50 text-white/50 text-xs font-bold transition-all cursor-not-allowed border border-white/5"
              title="Temporarily Disabled"
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Publish</span>
            </button>
          </div>
        )}

        {/* Auth Section */}
        {isLoggedIn && user ? (
          <div className="relative flex items-center gap-3">

            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-3 focus:outline-none group"
            >
              {/* Credits badge - visible on desktop */}
              <div className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${(user.credits || 0) < 25
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-white/5 text-white/80 border border-white/10'
                }`}>
                <CreditCard className="w-3.5 h-3.5" />
                <span>{user.credits || 0}</span>
              </div>

              <img
                src={user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name || user.email || 'User')}&backgroundColor=0369a1`}
                alt="User"
                className="w-10 h-10 rounded-full border-2 border-white/10 group-hover:border-[#57B9FF] transition-colors shadow-lg"
              />
            </button>

            {/* Profile Dropdown */}
            {showProfileMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowProfileMenu(false)}
                />
                <div className="absolute right-0 top-full mt-4 w-72 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl p-4 z-50 animate-fade-in-up">
                  <div className="flex items-center gap-4 mb-6 pb-6 border-b border-white/10">
                    <img
                      src={user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name || user.email || 'User')}&backgroundColor=0369a1`}
                      alt="User"
                      className="w-12 h-12 rounded-full bg-white/5 p-1 border border-white/10"
                    />
                    <div className="overflow-hidden">
                      <p className="text-base font-bold text-white truncate">{user.name}</p>
                      <p className="text-xs text-white/60 truncate">{user.email}</p>
                    </div>
                  </div>

                  <div className="mb-6 space-y-3">
                    <div className="flex items-center justify-between text-xs text-white/60 uppercase tracking-wider font-bold">
                      <span className="flex items-center gap-2"><CreditCard className="w-4 h-4" /> Credits</span>
                      <span className={`text-white ${(user.credits || 0) < 25 ? 'text-red-400' : ''}`}>{user.credits || 0} / 100</span>
                    </div>
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                      <div
                        className={`h-full shadow-[0_0_10px_rgba(87,185,255,0.5)] ${(user.credits || 0) < 25
                          ? 'bg-gradient-to-r from-red-500 to-orange-500'
                          : 'bg-gradient-to-r from-[#57B9FF] to-purple-500'
                          }`}
                        style={{ width: `${Math.min(100, user.credits || 0)}%` }}
                      ></div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onLogout?.();
                      setShowProfileMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-sm text-white transition-all text-left border border-transparent hover:border-white/5 group"
                  >
                    <LogOut className="w-5 h-5 text-white/60 group-hover:text-red-400 transition-colors" />
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <button
            onClick={onLogin}
            className="px-6 py-2.5 rounded-xl bg-white text-black font-bold text-sm hover:bg-vibe-100 transition-all shadow-lg active:scale-95 border border-transparent"
          >
            Sign In
          </button>
        )}
      </div>

      {/* Share Dialog */}
      {showShareDialog && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in" onClick={() => setShowShareDialog(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl p-6 z-[60] animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#57B9FF]" /> Invite Team
              </h3>
              <button onClick={() => { setShowShareDialog(false); setInviteLink(''); setInviteStatus({ type: null, message: '' }); }} className="text-vibe-200 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-6">
              {/* Invite Form */}
              <form onSubmit={handleInvite} className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="colleague@example.com"
                    className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-vibe-300 focus:outline-none focus:border-[#57B9FF] transition-colors"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                  />
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-white outline-none"
                  >
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#57B9FF] hover:bg-[#4ba3e3] text-black font-bold transition-all shadow-lg active:scale-95 text-sm"
                >
                  Send Invite
                </button>

                {/* Inline Feedback Message */}
                {inviteStatus.message && !inviteLink && (
                  <div className={`text-sm px-3 py-2 rounded-lg ${inviteStatus.type === 'error' ? 'bg-red-500/10 text-red-300 border border-red-500/20' : 'bg-green-500/10 text-green-300 border border-green-500/20'}`}>
                    {inviteStatus.message}
                  </div>
                )}
              </form>

              {/* Invite Link Result */}
              {inviteLink && (
                <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-sm">
                  <p className="text-green-400 mb-2 font-medium">✨ Invitation Link Created!</p>
                  <div className="flex items-center gap-2 bg-black/40 p-2 rounded-lg">
                    <span className="text-white/70 truncate flex-1">{inviteLink}</span>
                    <button onClick={() => copyToClipboard(inviteLink)} className="p-1 hover:text-white text-white/70">
                      {isCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Collaborators List */}
              <div className="border-t border-white/10 pt-4">
                <h4 className="text-sm font-bold text-white mb-3">Collaborators</h4>
                <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                  {isLoadingCollaborators ? (
                    <p className="text-xs text-white/40">Loading...</p>
                  ) : collaborators.length === 0 ? (
                    <p className="text-xs text-white/40">No other members yet.</p>
                  ) : (
                    collaborators.map(c => (
                      <div key={c.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 group/member">
                        <div className="flex items-center gap-3">
                          {c.avatar ? (
                            <img src={c.avatar} alt={c.name} className="w-8 h-8 rounded-full bg-white/10" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                              <User className="w-4 h-4 text-white/50" />
                            </div>
                          )}
                          <div>
                            <p className="text-sm text-white font-medium">{c.name || c.email}</p>
                            <p className="text-[10px] text-white/50">{c.type === 'pending' ? 'Pending Invite' : c.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-bold text-[#57B9FF] bg-[#57B9FF]/10 px-2 py-0.5 rounded">
                            {c.role}
                          </span>
                          {!c.is_owner && (
                            <button
                              onClick={() => removeMember(c.id, c.type)}
                              className="opacity-0 group-hover/member:opacity-100 p-1.5 hover:bg-red-500/20 text-red-400 rounded-md transition-all"
                              title="Remove"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Publish Dialog */}
      {showPublishDialog && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in" onClick={() => setShowPublishDialog(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl p-8 z-[60] animate-in zoom-in-95 duration-200 text-center">

            {!publishedUrl ? (
              <>
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 mx-auto mb-6 flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.3)]">
                  <Globe className={`w-8 h-8 text-white ${isPublishing ? 'animate-spin-slow' : ''}`} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Publish to VibeFresh</h3>
                <p className="text-vibe-200 mb-8">
                  Make your project accessible to the world. <br />This will generate a permanent public URL.
                </p>
                <button
                  onClick={handlePublish}
                  disabled={isPublishing}
                  className="w-full py-3 rounded-xl bg-white text-black font-bold hover:bg-white/90 transition-all active:scale-95"
                >
                  {isPublishing ? 'Publishing...' : 'Publish Project'}
                </button>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/30 mx-auto mb-6 flex items-center justify-center animate-bounce-slow">
                  <Check className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Project is Live!</h3>
                <p className="text-vibe-200 mb-6 text-sm">
                  Your project is now hosted at:
                </p>

                <div className="flex items-center gap-2 p-2 rounded-xl bg-black/40 border border-white/10 mb-6">
                  <input
                    readOnly
                    value={publishedUrl}
                    className="bg-transparent text-[#57B9FF] text-sm flex-1 outline-none px-2"
                  />
                  <button
                    onClick={() => copyToClipboard(publishedUrl)}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors"
                  >
                    {isCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex gap-3">
                  <a
                    href={publishedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2.5 rounded-xl bg-[#57B9FF] text-black font-bold text-sm hover:opacity-90 transition-opacity"
                  >
                    View Site
                  </a>
                  <button
                    onClick={() => { setShowPublishDialog(false); setPublishedUrl(''); }}
                    className="flex-1 py-2.5 rounded-xl border border-white/10 text-white font-medium text-sm hover:bg-white/5 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </>
            )}

          </div>
        </>
      )}
    </nav>
  );
};

export default Navbar;