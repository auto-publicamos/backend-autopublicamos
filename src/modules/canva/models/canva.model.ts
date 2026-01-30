export interface CanvaProfile {
  displayName: string;
  id?: string;
}

export interface CanvaUser {
  accessToken: string;
  refreshToken: string;
  profile: CanvaProfile;
}

export interface AuthenticatedRequest extends Request {
  user: CanvaUser;
}

export interface CanvaDesignResult {
  id: string;
  url: string;
  thumbnail?: string;
}

export interface ProcessedResult {
  total: number;
  success: number;
  failed: number;
  designs: CanvaDesignResult[];
}

export interface JobUpdate {
  type: 'log' | 'error' | 'success' | 'init' | 'step_start' | 'step_complete' | 'step_error' | 'step_progress';
  message: string;
  data?: any;
  progress?: number;
  metadata?: any;
}
