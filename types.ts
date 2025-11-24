
export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  isError?: boolean;
  steps?: GenerationStep[]; // For showing the realtime process
}

export interface GenerationStep {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'completed';
}

export interface ProjectFile {
  name: string;
  language: string;
  content: string;
}

export interface CodeSnippet {
  language: string;
  code: string;
}

export enum AppState {
  LANDING = 'LANDING',
  WORKSPACE = 'WORKSPACE'
}

export interface GeneratedPreview {
  files: ProjectFile[];
  version: number;
}

export interface HistoryItem {
  id: string;
  prompt: string;
  timestamp: number;
  files: ProjectFile[];
}
