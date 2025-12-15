
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { AppState, GeneratedPreview, HistoryItem, ProjectFile } from './types';
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import Workspace from './components/Workspace';
import BackgroundEffects from './components/BackgroundEffects';
import LoginPage from './components/LoginPage';
import SignupPage from './components/SignupPage';
import Sidebar from './components/Sidebar';
import JoinPage from './components/JoinPage';

import { projectService } from './services/projectService';

import { useParams } from 'react-router-dom';

// Intermediate wrapper to handle URL params and data fetching
const WorkspaceWrapper: React.FC<any> = (props) => {
  const { projectId } = useParams();
  const location = useLocation(); // Add location hook
  const { history, setActiveProjectId, setPreview, user, onSuccess } = props;
  const [isRestored, setIsRestored] = useState(false);
  const [fetchedProject, setFetchedProject] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Restore state from URL ID
  useEffect(() => {
    // 1. Check if we have project in Navigation State (Immediate Restore)
    if (location.state?.project) {
      const p = location.state.project;
      if (p.id === projectId) {
        console.log('Restoring from Navigation State:', p.id);
        setFetchedProject(p);
        setActiveProjectId(p.id);
        setPreview({
          files: p.files,
          version: Date.now()
        });
        return; // Done
      }
    }

    // 2. Check History
    if (projectId && history.length > 0) {
      const project = history.find((h: any) => h.id === projectId);
      if (project) {
        console.log('Restoring from URL History:', projectId);
        setActiveProjectId(projectId);
        setPreview({
          files: project.files,
          version: Date.now()
        });
        setIsRestored(true);
      }
    } else if (projectId && !history.find((h: any) => h.id === projectId)) {
      // 3. Not in history? Fetch it!
      const fetchIt = async () => {
        setIsLoading(true);
        const p = await projectService.getProject(projectId);
        if (p) {
          setFetchedProject(p);
          setActiveProjectId(p.id);
          setPreview({ files: p.files, version: Date.now() });
          if (onSuccess) onSuccess(p); // Optional: notify parent
        }
        setIsLoading(false);
      };
      fetchIt();
    }
  }, [projectId, history, setActiveProjectId, setPreview, location.state]);

  // If we are at /built (no ID), ensure we clear active ID unless we just created one
  useEffect(() => {
    if (!projectId) {
      setActiveProjectId(null);
      setPreview(null);
    }
  }, [projectId, setActiveProjectId, setPreview]);

  const activeProject = projectId ? (history.find((h: any) => h.id === projectId) || fetchedProject) : null;

  // Loading state if ID exists but not found yet (e.g. history fetching)
  if (projectId && !activeProject) {
    return <div className="h-full flex items-center justify-center text-vibe-200">Loading Project...</div>;
  }

  return (
    <Workspace
      key={projectId || 'new-workspace'} // Force remount when project changes to prevent stale state
      {...props}
      initialPrompt={activeProject ? activeProject.prompt : props.initialPrompt}
      initialMessages={activeProject ? activeProject.messages : undefined}
      shouldAutoGenerate={!projectId && !!props.initialPrompt} // Only auto-gen if NEW (no ID) and has prompt
      activeProjectId={projectId} // Pass explicit ID
      onToggleFullScreen={() => props.setIsPreviewFullScreen(!props.isPreviewFullScreen)}
    />
  );
};

const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="h-screen bg-black flex items-center justify-center text-white">Loading VibeFresh...</div>;

  if (!user) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  return children;
};

// Wrapper to provide navigation context we might need
const AppContent: React.FC = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [initialPrompt, setInitialPrompt] = useState<string | undefined>(undefined);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [mobileView, setMobileView] = useState<'chat' | 'preview'>('chat');

  // Lifted state to share between Workspace (generator) and Navbar (downloader)
  const [preview, setPreview] = useState<GeneratedPreview | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isSidebarMobileOpen, setIsSidebarMobileOpen] = useState(false);
  const [activeCodeTab, setActiveCodeTab] = useState<'preview' | 'code'>('preview');
  const [previewViewport, setPreviewViewport] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [isPreviewFullScreen, setIsPreviewFullScreen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false); // Track global generation state
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0); // For refreshing the iframe

  useEffect(() => {
    // Force dark theme for the true VibeCoder aesthetic
    document.documentElement.classList.add('dark');
  }, []);

  // Fetch projects when user logs in
  useEffect(() => {
    if (user) {
      loadProjects(user.id);
    } else {
      setHistory([]);
    }
  }, [user]);

  const loadProjects = async (userId: string) => {
    const projects = await projectService.getUserProjects(userId);
    setHistory(projects);
  };

  const updateOrAddHistory = async (prompt: string, files: ProjectFile[], messages: any[]) => {
    if (!user) {
      console.error('Cannot save: User not logged in');
      return;
    }

    // Reliable ID retrieval: Check state first, then fallback to URL
    let targetProjectId = activeProjectId;
    if (!targetProjectId) {
      const matches = location.pathname.match(/\/built\/([a-f0-9-]+)/);
      if (matches && matches[1]) {
        targetProjectId = matches[1];
        console.log("Recovered ProjectID from URL:", targetProjectId);
      }
    }

    console.log('Attemping to save project...', {
      userId: user.id,
      targetProjectId,
      promptLen: prompt.length,
      filesCount: files.length,
      messagesCount: messages.length
    });

    try {
      // activeProjectId might be null if new, or existing. 
      // We do NOT use URL ID here initially, because we might be creating a new one.
      // However, if we ARE editing an existing one, activeProjectId should be set.

      const savedProject = await projectService.saveProject(user.id, prompt, files, messages, targetProjectId || undefined);

      if (savedProject) {
        console.log('Project saved successfully:', savedProject.id);

        // Only navigate/reload if we weren't already on this project (avoid unnecessary reload)
        if (savedProject.id !== activeProjectId) {
          setActiveProjectId(savedProject.id);
          // Update URL to specific project ID if not already (replace current history entry)
          // Pass the savedProject in state so WorkspaceWrapper doesn't have to fetch it immediately (fixing race condition)
          navigate(`/built/${savedProject.id}`, { replace: true, state: { project: savedProject } });
        } else {
          // If we stayed on same project, just ensure state is sync
          // Maybe update the local history item?
          // For now, reloading list is safe.
        }

        // Refresh list to ensure sidebar is in sync
        loadProjects(user.id);
      } else {
        console.error('Project save returned null (failed).');
        // alert("Failed to save project! Please check console for details."); // Silent fail is better than annoying alert for auto-saves
      }
    } catch (err) {
      console.error('Unexpected error in updateOrAddHistory:', err);
    }
  };

  const toggleTheme = () => {
    setTheme('dark');
  };

  const handleStart = (prompt?: string) => {
    // Clear any existing project state to ensure a fresh start
    setActiveProjectId(null);
    setPreview(null);

    if (prompt) {
      setInitialPrompt(prompt);
      // If prompt passed, go to login (if not authed) or workspace (if authed)
      if (user) {
        navigate('/built');
      } else {
        navigate('/signin');
      }
    } else {
      // Just going to workspace without specific prompt (New Project)
      setInitialPrompt(undefined);
      if (user) {
        navigate('/built');
      } else {
        navigate('/signin');
      }
    }
  };

  const handleHistoryClick = (item: HistoryItem) => {
    // Navigate to the project URL. The useEffect/Route logic should handle the loading.
    navigate(`/built/${item.id}`);
    setIsSidebarMobileOpen(false);
  };

  const showNavbar = location.pathname !== '/signin' && location.pathname !== '/signup';
  const transparentNavbar = location.pathname === '/';
  // Workspace specific navbar props
  const isWorkspace = location.pathname.startsWith('/built');

  if (loading) return <div className="h-screen bg-black flex items-center justify-center text-white">Loading VibeFresh...</div>;

  return (
    <div className="h-[100dvh] text-foreground font-sans bg-background flex overflow-hidden relative">

      {/* Persistent Sidebar */}
      {showNavbar && (
        <Sidebar
          history={history}
          onHistoryClick={handleHistoryClick}
          isMobileOpen={isSidebarMobileOpen}
          onCloseMobile={() => setIsSidebarMobileOpen(false)}
          transparent={transparentNavbar}
          isExpanded={isSidebarExpanded}
          setIsExpanded={setIsSidebarExpanded}
          onToggleStar={async (projectId, isStarred) => {
            if (user) {
              await projectService.toggleStar(projectId, isStarred);
              loadProjects(user.id); // Reload list to update UI
            }
          }}
          onDeleteProject={async (projectId) => {
            if (user) {
              const success = await projectService.deleteProject(projectId);
              if (success) {
                loadProjects(user.id);
                // If we deleted the ACTIVE project, clear the workspace
                if (activeProjectId === projectId) {
                  setActiveProjectId(null);
                  setInitialPrompt(undefined);
                  setPreview(null);
                  navigate('/built');
                }
              }
            }
          }}
          user={user ? {
            name: user.full_name || user.email?.split('@')[0] || 'User',
            email: user.email || '',
            avatar: user.avatar_url,
          } : undefined}
          onLogout={() => {
            signOut();
            navigate('/');
          }}
          onLogin={() => navigate('/signin')}
        />
      )}

      {/* Main Layout - Content Area */}
      <div className={`flex-1 flex relative transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
        ${isWorkspace ? 'h-full pt-16' : 'h-full pt-0'}
        ${showNavbar ? (isSidebarExpanded ? 'md:ml-72' : 'md:ml-[60px]') : ''}
      `}>
        <BackgroundEffects />

        {showNavbar && (
          <Navbar
            appState={isWorkspace ? AppState.WORKSPACE : AppState.LANDING}
            setAppState={() => { }} // No longer used for nav
            theme={theme}
            toggleTheme={toggleTheme}
            mobileView={mobileView}
            preview={preview}
            onToggleSidebar={() => setIsSidebarMobileOpen(true)}
            isLoggedIn={!!user}
            user={user ? {
              name: user.full_name || user.email?.split('@')[0] || 'User',
              email: user.email || '',
              credits: user.credits || 0,
              avatar: user.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.full_name || user.email || 'User')}&backgroundColor=0369a1`
            } : undefined}
            onLogin={() => navigate('/signin')}
            onExitWorkspace={() => {
              setActiveProjectId(null);
              navigate('/');
            }}
            onLogout={() => {
              signOut();
              navigate('/');
            }}
            isGenerating={isGenerating}
            onRefreshPreview={() => {
              // Increment refresh key to force iframe reload
              setPreviewRefreshKey(prev => prev + 1);
            }}
            isMobileSidebarOpen={isSidebarMobileOpen}
            isSidebarExpanded={isSidebarExpanded}
            activeCodeTab={activeCodeTab}
            setActiveCodeTab={setActiveCodeTab}
            previewViewport={previewViewport}
            setPreviewViewport={setPreviewViewport}
            isPreviewFullScreen={isPreviewFullScreen}
            setIsPreviewFullScreen={setIsPreviewFullScreen}
            activeProjectTitle={activeProjectId ? history.find(h => h.id === activeProjectId)?.prompt : undefined}
            activeProjectId={activeProjectId}
          />
        )}

        <main className="flex-1 flex flex-col relative overflow-hidden h-full">
          <Routes>
            <Route path="/" element={<LandingPage onStart={handleStart} />} />

            <Route path="/signin" element={
              !user ? <LoginPage
                onLogin={() => {
                  // Navigate to origin or default
                  const origin = location.state?.from?.pathname || '/built';
                  // If origin is /signin or /signup, go to /built to avoid loop
                  const target = (origin === '/signin' || origin === '/signup') ? '/built' : origin;
                  navigate(target);
                }}
                onGoToSignup={() => navigate('/signup')}
                onBack={() => navigate('/')}
              /> : <Navigate to={location.state?.from?.pathname || "/built"} replace />
            } />

            <Route path="/signup" element={
              !user ? <SignupPage
                onSignup={() => {
                  const origin = location.state?.from?.pathname || '/built';
                  const target = (origin === '/signin' || origin === '/signup') ? '/built' : origin;
                  navigate(target);
                }}
                onGoToLogin={() => navigate('/signin')}
              /> : <Navigate to={location.state?.from?.pathname || "/built"} replace />
            } />

            {/* Route for NEW project */}
            <Route path="/built" element={
              <RequireAuth>
                <WorkspaceWrapper
                  user={user}
                  history={history}
                  initialPrompt={initialPrompt}
                  activeProjectId={null}
                  setActiveProjectId={setActiveProjectId}
                  setPreview={setPreview}
                  preview={preview}
                  mobileView={mobileView}
                  setMobileView={setMobileView}
                  activeCodeTab={activeCodeTab}
                  setActiveCodeTab={setActiveCodeTab}
                  previewViewport={previewViewport}
                  setPreviewViewport={setPreviewViewport}
                  isPreviewFullScreen={isPreviewFullScreen}
                  setIsPreviewFullScreen={setIsPreviewFullScreen}
                  onSuccess={updateOrAddHistory}
                  setIsGenerating={setIsGenerating}
                  previewRefreshKey={previewRefreshKey}
                />
              </RequireAuth>
            } />

            {/* Route for EXISTING project */}
            <Route path="/built/:projectId" element={
              <RequireAuth>
                <WorkspaceWrapper
                  user={user}
                  history={history}
                  activeProjectId={null}
                  setActiveProjectId={setActiveProjectId}
                  setPreview={setPreview}
                  preview={preview}
                  mobileView={mobileView}
                  setMobileView={setMobileView}
                  activeCodeTab={activeCodeTab}
                  setActiveCodeTab={setActiveCodeTab}
                  previewViewport={previewViewport}
                  setPreviewViewport={setPreviewViewport}
                  isPreviewFullScreen={isPreviewFullScreen}
                  setIsPreviewFullScreen={setIsPreviewFullScreen}
                  onSuccess={updateOrAddHistory}
                  setIsGenerating={setIsGenerating}
                  previewRefreshKey={previewRefreshKey}
                />
              </RequireAuth>
            } />

            {/* Join Project Route */}
            <Route path="/join" element={<JoinPage />} />

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
