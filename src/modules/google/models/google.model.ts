export interface GoogleProfile {
  email: string;
  firstName: string;
  lastName: string;
  picture: string;
}

export interface GoogleUser extends GoogleProfile {
  accessToken: string;
  refreshToken: string;
}

export interface GoogleDriveFile {
  id?: string | null;
  name?: string | null;
  mimeType?: string | null;
  thumbnailLink?: string | null;
  webContentLink?: string | null;
}
