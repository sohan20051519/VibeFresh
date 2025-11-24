
import React, { useState, useEffect } from 'react';
import { AppState, GeneratedPreview, HistoryItem, ProjectFile } from './types';
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import Workspace from './components/Workspace';
import BackgroundEffects from './components/BackgroundEffects';

const HISTORY_KEY = 'vibecoder_history';
const HISTORY_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.LANDING);
  const [initialPrompt, setInitialPrompt] = useState<string | undefined>(undefined);
  const [shouldAutoGenerate, setShouldAutoGenerate] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [mobileView, setMobileView] = useState<'chat' | 'preview'>('chat');
  
  // Lifted state to share between Workspace (generator) and Navbar (downloader)
  const [preview, setPreview] = useState<GeneratedPreview | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    // Force dark theme for the true VibeCoder aesthetic
    document.documentElement.classList.add('dark');
    
    // Load History
    loadHistory();
  }, []);

  const loadHistory = () => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) {
        const parsed: HistoryItem[] = JSON.parse(stored);
        const now = Date.now();
        // Filter out items older than 24 hours
        const validHistory = parsed.filter(item => (now - item.timestamp) < HISTORY_EXPIRY_MS);
        
        // Update local storage if we cleaned up old items
        if (validHistory.length !== parsed.length) {
          localStorage.setItem(HISTORY_KEY, JSON.stringify(validHistory));
        }
        
        setHistory(validHistory.sort((a, b) => b.timestamp - a.timestamp));
      }
    } catch (e) {
      console.error("Failed to load history", e);
    }
  };

  const addToHistory = (prompt: string, files: ProjectFile[]) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      prompt,
      timestamp: Date.now(),
      files
    };

    const updatedHistory = [newItem, ...history].slice(0, 10); // Keep last 10
    setHistory(updatedHistory);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
  };

  const toggleTheme = () => {
    // Theme toggling disabled for this specific aesthetic request (Dark mode only)
    setTheme('dark');
  };
  
  const handleStart = (prompt?: string) => {
    setInitialPrompt(prompt);
    setShouldAutoGenerate(true);
    setAppState(AppState.WORKSPACE);
    // Automatically switch to chat view on mobile when starting
    if (prompt) {
      setMobileView('chat');
    }
  };

  const handleHistoryClick = (item: HistoryItem) => {
    setPreview({
      files: item.files,
      version: Date.now()
    });
    setInitialPrompt(item.prompt);
    setShouldAutoGenerate(false); // Don't regenerate, just restore
    setAppState(AppState.WORKSPACE);
    setMobileView('preview'); // Show preview directly when restoring
  };

  return (
    <div className="h-[100dvh] text-foreground font-sans bg-background flex flex-col overflow-hidden relative">
      <BackgroundEffects />
      
      <Navbar 
        appState={appState} 
        setAppState={setAppState} 
        theme={theme}
        toggleTheme={toggleTheme}
        mobileView={mobileView}
        setMobileView={setMobileView}
        preview={preview}
      />
      
      <main className="flex-1 flex flex-col relative overflow-hidden h-full">
        {appState === AppState.LANDING && (
          <LandingPage 
            onStart={handleStart} 
            history={history}
            onHistoryClick={handleHistoryClick}
          />
        )}
        {appState === AppState.WORKSPACE && (
          <Workspace 
            initialPrompt={initialPrompt} 
            shouldAutoGenerate={shouldAutoGenerate}
            mobileView={mobileView}
            setMobileView={setMobileView}
            preview={preview}
            setPreview={setPreview}
            onSuccess={addToHistory}
          />
        )}
      </main>
    </div>
  );
};

export default App;
