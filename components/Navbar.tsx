import React from 'react';
import { AppState, GeneratedPreview } from '../types';
import { Layout, Github, Twitter, ArrowLeft, Download } from 'lucide-react';
import JSZip from 'jszip';

interface NavbarProps {
  setAppState: (state: AppState) => void;
  appState: AppState;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  mobileView: 'chat' | 'preview';
  setMobileView: (view: 'chat' | 'preview') => void;
  preview: GeneratedPreview | null;
}

const Navbar: React.FC<NavbarProps> = ({ 
  setAppState, 
  appState, 
  preview
}) => {
  
  const handleDownload = async () => {
    if (!preview?.files) return;
    
    const zip = new JSZip();
    preview.files.forEach(file => {
      zip.file(file.name, file.content);
    });
    
    const content = await zip.generateAsync({ type: "blob" });
    const url = window.URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vibefresh-project.zip";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <nav className="h-14 border-b border-vibe-300 bg-vibe-400 sticky top-0 z-50 flex items-center justify-between px-4 lg:px-6 shadow-sm flex-none">
      <div className="flex items-center gap-4">
        {appState === AppState.WORKSPACE && (
           <button 
             onClick={() => setAppState(AppState.LANDING)}
             className="p-2 rounded-lg hover:bg-vibe-300 text-vibe-200 hover:text-vibe-100 transition-colors"
           >
             <ArrowLeft className="w-4 h-4" />
           </button>
        )}
        
        <div 
          className="flex items-center gap-2 cursor-pointer group"
          onClick={() => setAppState(AppState.LANDING)}
        >
          <div className="w-8 h-8 rounded-lg bg-vibe-300/50 border border-vibe-300 flex items-center justify-center transition-all group-hover:bg-vibe-300 group-hover:text-vibe-100">
            <Layout className="w-5 h-5 text-vibe-100 transition-colors" />
          </div>
          <span className="font-bold text-lg tracking-tight text-vibe-100 hidden sm:inline-block">VibeFresh</span>
        </div>

        {appState === AppState.WORKSPACE && (
          <>
            <div className="h-4 w-px bg-vibe-300 mx-2 hidden sm:block"></div>
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-sm font-medium text-vibe-100">Untitled Project</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-vibe-300 text-vibe-200 border border-vibe-300">DRAFT</span>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {appState === AppState.LANDING ? (
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-vibe-200">
            <a href="#" className="hover:text-vibe-100 transition-colors">Showcase</a>
            <a href="#" className="hover:text-vibe-100 transition-colors">Pricing</a>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button 
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-vibe-100 text-vibe-500 hover:bg-white transition-all shadow-lg shadow-vibe-100/10"
              title="Download Zip"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        )}

        <div className="h-4 w-px bg-vibe-300 hidden sm:block"></div>
        
        <div className="flex items-center gap-2">
           {appState === AppState.LANDING && (
             <>
               <a href="#" className="hidden sm:block p-2 rounded-lg hover:bg-vibe-300 text-vibe-200 hover:text-vibe-100 transition-colors">
                 <Github className="w-4 h-4" />
               </a>
               <a href="#" className="hidden sm:block p-2 rounded-lg hover:bg-vibe-300 text-vibe-200 hover:text-vibe-100 transition-colors">
                 <Twitter className="w-4 h-4" />
               </a>
             </>
           )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;