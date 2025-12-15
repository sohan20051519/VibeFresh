
export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  isError?: boolean;
  steps?: GenerationStep[]; // For showing the realtime process
  actions?: ('preview' | 'explorer')[]; // For interactive buttons after completion
  attachments?: string[]; // Base64 encoded images
  creditsRemaining?: number; // Credits remaining after this generation
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
  WORKSPACE = 'WORKSPACE',
  LOGIN = 'LOGIN',
  SIGNUP = 'SIGNUP'
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
  messages?: Message[];
  is_starred?: boolean; // New field
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  credits: number;
  created_at?: string;
}

export interface AuthState {
  user: UserProfile | null;
  session: any | null; // using any for supabase Session to avoid circular deps if possible, or usually just import from supabase-js in types if needed, but better to keep types clean. Actually let's just keep it simple.
  loading: boolean;
}
