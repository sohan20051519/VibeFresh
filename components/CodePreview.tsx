import React, { useState, useEffect, useMemo, useRef } from 'react';
import { GeneratedPreview } from '../types';
import {
  Code2,
  Eye,
  Smartphone,
  Tablet,
  Monitor,
  RotateCw,
  FileCode,
  FileJson,
  FileType,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Maximize2,
  Minimize2,
  Sparkles // Added import
} from 'lucide-react';

interface CodePreviewProps {
  preview: GeneratedPreview | null;
  isGenerating: boolean;
  isMobile?: boolean;
  activeTab?: 'preview' | 'code';
  onTabChange?: (tab: 'preview' | 'code') => void;
  viewport?: 'mobile' | 'tablet' | 'desktop';
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
  refreshKey?: number; // Added prop
}

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  language?: string;
}

declare global {
  interface Window {
    Prism: any;
  }
}

const CodePreview: React.FC<CodePreviewProps> = ({
  preview,
  isGenerating,
  isMobile = false,
  activeTab = 'preview',
  onTabChange,
  viewport = 'desktop',
  isFullScreen = false,
  onToggleFullScreen,
  refreshKey = 0 // Default
}) => {
  // const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview'); 
  const [activeFile, setActiveFile] = useState<string>('index.html');
  const [iframeKey, setIframeKey] = useState(0);
  // We use refreshKey to FORCE remounts, but otherwise we let srcDoc handle updates.
  // Actually, we can just use refreshKey directly as part of the key.

  const [combinedHtml, setCombinedHtml] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root', 'src']));

  const codeContainerRef = useRef<HTMLDivElement>(null);
  const codeElementRef = useRef<HTMLElement>(null);

  // ... effects ...

  // Auto-switch to latest file
  useEffect(() => {
    if (isGenerating && preview?.files && preview.files.length > 0) {
      const lastFile = preview.files[preview.files.length - 1];
      if (lastFile && lastFile.name !== activeFile) {
        setActiveFile(lastFile.name);
      }
    }
  }, [preview?.files?.length, isGenerating]);

  // Auto-scroll
  useEffect(() => {
    if (!isMobile && isGenerating && activeTab === 'code' && codeContainerRef.current) {
      codeContainerRef.current.scrollTop = codeContainerRef.current.scrollHeight;
    }
  }, [preview, isGenerating, activeTab, activeFile, isMobile]);

  // Syntax Highlight
  useEffect(() => {
    if (!isMobile && activeTab === 'code' && codeElementRef.current && window.Prism) {
      window.Prism.highlightElement(codeElementRef.current);
    }
  }, [activeFile, preview, activeTab, isMobile]);

  // Build File Tree
  const fileTree = useMemo(() => {
    if (!preview?.files) return [];
    const rootChildren: FileNode[] = [];
    const srcChildren: FileNode[] = [];
    preview.files.forEach(file => {
      if (!file || !file.name) return; // Skip invalid files
      const node: FileNode = { name: file.name, path: file.name, type: 'file', language: file.language };
      if (['index.html', 'package.json', 'vite.config.js'].includes(file.name)) {
        rootChildren.push(node);
      } else {
        srcChildren.push(node);
      }
    });
    const tree: FileNode[] = [];
    if (srcChildren.length > 0) tree.push({ name: 'src', path: 'src', type: 'folder', children: srcChildren });
    tree.push(...rootChildren);
    return tree;
  }, [preview?.files]);

  // Iframe Builder
  useEffect(() => {
    console.log("CodePreview: Generating iframe content", { files: preview?.files });
    if (preview?.files) {
      const htmlFile = preview.files.find(f => f.name === 'index.html')?.content || '';
      console.log("CodePreview: Found index.html length:", htmlFile.length);

      const cssFile = preview.files.find(f => f.name === 'styles.css')?.content || '';
      const jsFile = preview.files.find(f => f.name === 'script.js')?.content || '';
      // ...

      let fullHtml = htmlFile;

      // Inject CSS
      if (cssFile) {
        // Remove build-time Tailwind directives if present, as they break browser parsing
        const browserCss = cssFile.replace(/@tailwind\s+(base|components|utilities);/g, '');

        fullHtml = fullHtml.includes('</head>')
          ? fullHtml.replace('</head>', `<style>${browserCss}</style></head>`)
          : fullHtml + `<style>${browserCss}</style>`;
      }

      // INJECT GLOBAL THEME VARIABLES (Critical for Tailwind config to work)
      const globalStyles = `
        <style>
          :root {
            --bg-background: #0a0a0a;
            --bg-surface: #171717;
            --text-main: #ededed;
            --text-muted: #888888;
            --border-color: #333333;
            
            /* Shadcn/Standard Mappings if AI uses them */
            --background: 0 0% 3.9%;
            --foreground: 0 0% 98%;
            --card: 0 0% 3.9%;
            --card-foreground: 0 0% 98%;
            --popover: 0 0% 3.9%;
            --popover-foreground: 0 0% 98%;
            --primary: 0 0% 98%;
            --primary-foreground: 240 5.9% 10%;
            --secondary: 240 3.7% 15.9%;
            --secondary-foreground: 0 0% 98%;
            --muted: 240 3.7% 15.9%;
            --muted-foreground: 240 5% 64.9%;
            --accent: 240 3.7% 15.9%;
            --accent-foreground: 0 0% 98%;
            --destructive: 0 62.8% 30.6%;
            --destructive-foreground: 0 0% 98%;
            --border: 240 3.7% 15.9%;
            --input: 240 3.7% 15.9%;
            --ring: 240 4.9% 83.9%;
            --radius: 0.5rem;
          }
          body {
            background-color: var(--bg-background);
            color: var(--text-main);
            min-height: 100vh;
            margin: 0;
          }
        </style>
      `;
      // Prepend to head so user CSS can override if needed, but variables are available
      fullHtml = fullHtml.includes('<head>')
        ? fullHtml.replace('<head>', `<head>${globalStyles}`)
        : globalStyles + fullHtml;

      // Ensure Tailwind CDN is present for the preview to render styled content
      if (!fullHtml.includes('cdn.tailwindcss.com')) {
        const tailwindScript = '<script src="https://cdn.tailwindcss.com"></script>';
        // Add some default config to support typical AI output assumptions
        const tailwindConfig = `
          <script>
            tailwind.config = {
              darkMode: 'class',
              theme: {
                extend: {
                  colors: {
                    background: 'var(--bg-background)',
                    surface: 'var(--bg-surface)',
                    foreground: 'var(--text-main)',
                    muted: 'var(--text-muted)',
                    border: 'var(--border-color)',
                    // Standard Shadcn mappings (HSL)
                    border: "hsl(var(--border))",
                    input: "hsl(var(--input))",
                    ring: "hsl(var(--ring))",
                    background: "hsl(var(--background))",
                    foreground: "hsl(var(--foreground))",
                    primary: {
                      DEFAULT: "hsl(var(--primary))",
                      foreground: "hsl(var(--primary-foreground))",
                    },
                    secondary: {
                      DEFAULT: "hsl(var(--secondary))",
                      foreground: "hsl(var(--secondary-foreground))",
                    },
                    destructive: {
                      DEFAULT: "hsl(var(--destructive))",
                      foreground: "hsl(var(--destructive-foreground))",
                    },
                    muted: {
                      DEFAULT: "hsl(var(--muted))",
                      foreground: "hsl(var(--muted-foreground))",
                    },
                    accent: {
                      DEFAULT: "hsl(var(--accent))",
                      foreground: "hsl(var(--accent-foreground))",
                    },
                    popover: {
                      DEFAULT: "hsl(var(--popover))",
                      foreground: "hsl(var(--popover-foreground))",
                    },
                    card: {
                      DEFAULT: "hsl(var(--card))",
                      foreground: "hsl(var(--card-foreground))",
                    },
                  }
                }
              }
            }
          </script>
        `;

        fullHtml = fullHtml.includes('<head>')
          ? fullHtml.replace('<head>', `<head>${tailwindScript}${tailwindConfig}`)
          : tailwindScript + fullHtml;
      }

      // Inject JS
      if (jsFile) {
        fullHtml = fullHtml.includes('</body>')
          ? fullHtml.replace('</body>', `<script>${jsFile}</script></body>`)
          : fullHtml + `<script>${jsFile}</script>`;
      }

      setCombinedHtml(fullHtml);
      // setIframeKey(prev => prev + 1); // REMOVED: Do not auto-increment key, just update html. 
    }
  }, [preview]);

  // Removed internal ESC handler for controlled fullscreen


  useEffect(() => {
    if (isMobile) {
      onTabChange?.('preview');
      return;
    }
    if (isGenerating) onTabChange?.('code');
    else if (preview) onTabChange?.('preview');
  }, [isGenerating, preview, isMobile]);

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const currentFileContent = preview?.files.find(f => f.name === activeFile)?.content || '';

  const getFileIcon = (name: string) => {
    if (name.endsWith('.html')) return <FileCode className="w-4 h-4 text-vibe-200" />;
    if (name.endsWith('.css')) return <FileType className="w-4 h-4 text-vibe-200" />;
    if (name.endsWith('.js') || name.endsWith('.ts')) return <FileJson className="w-4 h-4 text-vibe-200" />;
    return <Code2 className="w-4 h-4 text-vibe-200" />;
  };

  const renderTreeItem = (node: FileNode, depth: number = 0) => {
    if (node.type === 'folder') {
      const isOpen = expandedFolders.has(node.path);
      return (
        <div key={node.path}>
          <div
            className="flex items-center gap-1.5 py-1 px-2 hover:bg-vibe-300/30 cursor-pointer text-vibe-200 select-none transition-colors rounded-sm mx-2"
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            onClick={() => toggleFolder(node.path)}
          >
            {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            {isOpen ? <FolderOpen className="w-4 h-4 text-vibe-200" /> : <Folder className="w-4 h-4 text-vibe-200" />}
            <span className="text-xs font-medium">{node.name}</span>
          </div>
          {isOpen && node.children?.map(child => renderTreeItem(child, depth + 1))}
        </div>
      );
    }
    const isActive = activeFile === node.path;
    return (
      <div
        key={node.path}
        className={`
          flex items-center gap-2 py-1 px-2 cursor-pointer select-none transition-all mx-2 rounded-sm
          ${isActive
            ? 'bg-vibe-300 text-vibe-100'
            : 'text-vibe-200 hover:bg-vibe-300/30 hover:text-vibe-100'}
        `}
        style={{ paddingLeft: `${depth * 12 + 20}px` }}
        onClick={() => setActiveFile(node.path)}
      >
        {getFileIcon(node.name)}
        <span className="text-xs">{node.name}</span>
      </div>
    );
  };

  // Mobile View: Pure Preview Iframe Logic merged below for consistent FullScreen handling
  // if (isMobile) { ... } REMOVED to allow unified FullScreen logic

  // Unified View
  return (
    <div className={`flex flex-col bg-vibe-500 transition-all duration-300 ${isFullScreen || (isMobile && activeTab === 'preview') ? 'fixed inset-0 z-[100]' : 'h-full w-full'}`}>
      {/* Floating Minimize Button for Full Screen Mode */}
      {isFullScreen && (
        <button
          onClick={onToggleFullScreen}
          className="absolute top-4 right-4 z-[110] p-2 bg-black/60 hover:bg-black/80 text-white rounded-xl backdrop-blur-md transition-all border border-white/10 shadow-2xl group animate-in fade-in duration-300"
          title="Exit Full Screen"
        >
          <Minimize2 className="w-5 h-5 text-[#57B9FF] group-hover:scale-110 transition-transform" />
        </button>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* File Explorer - Only visible in Code tab */}
        {activeTab === 'code' && !isMobile && ( // Hide explorer on mobile generally unless requested, keeping simplified
          <div className="w-64 flex-none bg-vibe-500 border-r border-vibe-300 flex flex-col animate-in slide-in-from-left-5 duration-200">
            <div className="h-8 flex items-center px-4 text-[10px] font-bold text-vibe-200 uppercase tracking-widest mt-2">
              Explorer
            </div>
            <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
              {preview?.files && preview.files.length > 0 ? (
                <div className="space-y-0.5">
                  <div
                    className="flex items-center gap-1.5 py-1 px-2 text-vibe-100 font-bold select-none mx-2 mb-1"
                    onClick={() => toggleFolder('root')}
                  >
                    {expandedFolders.has('root') ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    <span className="text-xs uppercase tracking-widest">PROJECT</span>
                  </div>
                  {expandedFolders.has('root') && (
                    <div className="mt-0.5">
                      {fileTree.map(node => renderTreeItem(node, 0))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 text-xs text-vibe-200 italic text-center">Initializing...</div>
              )}
            </div>
          </div>
        )}

        {/* Editor or Preview */}
        <div className="flex-1 flex flex-col min-w-0 bg-vibe-500 h-full relative">
          {activeTab === 'code' ? (
            <div ref={codeContainerRef} className="absolute inset-0 overflow-auto custom-scrollbar bg-vibe-500 p-6">
              <pre className="!bg-transparent !m-0 !p-0 font-mono text-sm leading-relaxed">
                <code ref={codeElementRef} className={`language-${activeFile.endsWith('html') ? 'html' : activeFile.endsWith('css') ? 'css' : 'javascript'}`}>
                  {currentFileContent}
                </code>
              </pre>
            </div>
          ) : (
            <div className={`absolute inset-0 flex items-center justify-center bg-[#121212] ${isMobile ? 'p-0' : 'p-8'}`}>
              {/* Thinking State Overlay: Show ONLY if generating AND no files yet (Architecting Phase) */}
              {isGenerating && (!preview?.files || preview.files.length === 0) ? (
                <div className="flex flex-col items-center justify-center gap-4 animate-in fade-in zoom-in duration-500">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-[#57B9FF]/30 border-t-[#57B9FF] animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-[#57B9FF] animate-pulse" />
                    </div>
                  </div>
                  <div className="text-center space-y-1">
                    <h3 className="text-xl font-bold text-white tracking-tight">Architecting Vibe & Construction...</h3>
                    <p className="text-vibe-200 text-sm">Analyzing requirements and scaffolding project structure</p>
                  </div>
                </div>
              ) : (
                <div className={`h-full bg-white transition-all duration-500 ease-in-out shadow-2xl overflow-hidden ${
                  // On mobile, force full width/height with no borders if full screen or just mobile view
                  isMobile ? 'w-full h-full rounded-none border-0' :
                    viewport === 'mobile' ? 'w-[375px] rounded-[2rem] border-[8px] border-[#333]' :
                      viewport === 'tablet' ? 'w-[768px] rounded-[1.5rem] border-[8px] border-[#333]' :
                        'w-full rounded-lg border border-[#333]'
                  }`}>
                  <iframe
                    key={`${iframeKey}-${refreshKey}`} // Combine refreshKey for manual reload
                    srcDoc={combinedHtml || (preview?.files?.length === 0 ? '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#888;font-family:sans-serif;background:#0a0a0a;">No files found in project.</div>' :
                      '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#888;font-family:sans-serif;background:#0a0a0a;gap:1rem;">' +
                      '<div style="width:24px;height:24px;border:2px solid #333;border-top-color:#ededed;border-radius:50%;animation:spin 1s linear infinite"></div>' +
                      '<div>Rendered successfully</div>' +
                      '<style>@keyframes spin { to { transform: rotate(360deg); } }</style>' +
                      '</div>')}
                    className="w-full h-full bg-white transition-opacity duration-300"
                    sandbox="allow-scripts allow-modals allow-forms allow-popups allow-same-origin"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CodePreview;