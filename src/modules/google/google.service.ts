import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { GoogleDriveFile } from './models/google.model';

@Injectable()
export class GoogleService {
  constructor(private configService: ConfigService) {}

  handleAuthRedirect(req: any, res: any) {
    const { accessToken, refreshToken, email, picture } = req.user;

    // Redirigir a la página de callback que enviará los datos al opener via postMessage
    const callbackUrl = `/oauth-callback.html?googleToken=${accessToken}&googleRefreshToken=${
      refreshToken || ''
    }&googleEmail=${encodeURIComponent(email)}&googlePic=${encodeURIComponent(picture)}`;

    res.redirect(callbackUrl);
  }

  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken?: string }> {
    const auth = new google.auth.OAuth2(
      this.configService.get('GOOGLE_CLIENT_ID'),
      this.configService.get('GOOGLE_CLIENT_SECRET'),
      this.configService.get('GOOGLE_CALLBACK_URL'),
    );

    auth.setCredentials({ refresh_token: refreshToken });

    try {
      const { credentials } = await auth.refreshAccessToken();
      return {
        accessToken: credentials.access_token,
        refreshToken: credentials.refresh_token,
      };
    } catch (error) {
      console.error('Error refreshing token', error);
      throw new UnauthorizedException('No se pudo refrescar el token');
    }
  }

  async verifyToken(authHeader: string): Promise<{ valid: boolean; email?: string }> {
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: token });

    try {
      const oauth2 = google.oauth2({ version: 'v2', auth });
      const { data } = await oauth2.userinfo.get();
      return { valid: true, email: data.email };
    } catch (error) {
      throw new UnauthorizedException('Token is invalid or expired');
    }
  }

  async listImages(
    authHeader: string,
    folderId: string = 'root',
    pageToken?: string,
    pageSize: number = 20,
  ): Promise<{ files: GoogleDriveFile[]; nextPageToken?: string }> {
    if (!authHeader) throw new UnauthorizedException('Falta el token');
    const accessToken = authHeader.replace('Bearer ', '');

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    const drive = google.drive({ version: 'v3', auth });

    try {
      const response = await drive.files.list({
        q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
        fields: 'nextPageToken, files(id, name, thumbnailLink, webContentLink, mimeType)',
        pageSize,
        pageToken,
      });

      const files: GoogleDriveFile[] =
        response.data.files?.map((file) => ({
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          webContentLink: file.webContentLink,
          thumbnailLink: file.thumbnailLink?.replace('=s220', ''),
        })) || [];

      return { files, nextPageToken: response.data.nextPageToken };
    } catch (error) {
      console.error('Error fetching Drive files:', error);
      throw new Error('No se pudieron obtener los archivos de Drive');
    }
  }

  async listFolders(
    authHeader: string,
    folderId: string = 'root',
    pageSize: number = 1000,
  ): Promise<GoogleDriveFile[]> {
    if (!authHeader) throw new UnauthorizedException('Falta el token');
    const accessToken = authHeader.replace('Bearer ', '');

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    const drive = google.drive({ version: 'v3', auth });

    try {
      const response = await drive.files.list({
        q: `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'nextPageToken, files(id, name, mimeType)',
        pageSize,
      });

      const files: GoogleDriveFile[] =
        response.data.files?.map((file) => ({
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
        })) || [];

      return files;
    } catch (error) {
      console.error('Error fetching Drive folders:', error);
      throw new Error('No se pudieron obtener las carpetas de Drive');
    }
  }

  async listDocs(
    authHeader: string,
    folderId: string = 'root',
    pageToken?: string,
    pageSize: number = 20,
  ): Promise<{ files: GoogleDriveFile[]; nextPageToken?: string }> {
    if (!authHeader) throw new UnauthorizedException('Falta el token');
    const accessToken = authHeader.replace('Bearer ', '');

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    const drive = google.drive({ version: 'v3', auth });

    try {
      const response = await drive.files.list({
        q: `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.document' and trashed = false`,
        fields: 'nextPageToken, files(id, name, mimeType, iconLink)',
        pageSize,
        pageToken,
      });

      const files: GoogleDriveFile[] =
        response.data.files?.map((file) => ({
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          thumbnailLink: file.iconLink, // Use icon as thumbnail for docs
        })) || [];

      return { files, nextPageToken: response.data.nextPageToken };
    } catch (error) {
      console.error('Error fetching Google Docs:', error);
      throw new Error('No se pudieron obtener los documentos de Google');
    }
  }

  async getDocContent(authHeader: string, docId: string): Promise<{ content: string }> {
    if (!authHeader) throw new UnauthorizedException('Falta el token');
    const accessToken = authHeader.replace('Bearer ', '');

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    const docs = google.docs({ version: 'v1', auth });

    try {
      const response = await docs.documents.get({
        documentId: docId,
      });

      // Extract text content from the document
      let content = '';
      const body = response.data.body;

      if (body && body.content) {
        for (const element of body.content) {
          if (element.paragraph) {
            for (const textElement of element.paragraph.elements || []) {
              if (textElement.textRun && textElement.textRun.content) {
                content += textElement.textRun.content;
              }
            }
          }
        }
      }

      return { content };
    } catch (error) {
      console.error('Error fetching Google Doc content:', error);
      throw new Error('No se pudo obtener el contenido del documento');
    }
  }

  async createSheet(authHeader: string, title: string, data: { name: string; url: string }[]): Promise<string> {
    if (!authHeader) throw new UnauthorizedException('Falta el token');
    const accessToken = authHeader.replace('Bearer ', '');

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    const sheets = google.sheets({ version: 'v4', auth });

    try {
      // 1. Create Spreadsheet
      const createRes = await sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: title,
          },
        },
      });

      const spreadsheetId = createRes.data.spreadsheetId;
      const spreadsheetUrl = createRes.data.spreadsheetUrl;

      // 2. Prepare Data
      const headerRow = ['Nombre del Diseño', 'Enlace Canva'];
      const rows = data.map((item) => [item.name, item.url]);
      const values = [headerRow, ...rows];

      // 3. Write Data
      // Note: 'Sheet1' might be named 'Hoja 1' in Spanish accounts, or something else.
      // Using 'A1' without sheet name usually works for the first sheet.
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'A1',
        valueInputOption: 'RAW',
        requestBody: {
          values: values,
        },
      });

      return spreadsheetUrl;
    } catch (error) {
      console.error('Error creating sheet:', error);
      throw new Error('No se pudo crear la hoja de cálculo');
    }
  }
}
