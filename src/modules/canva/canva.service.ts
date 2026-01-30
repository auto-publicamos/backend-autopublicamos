import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CanvaDesignResult, ProcessedResult } from './models/canva.model';
import { GoogleService } from '../google/google.service';

@Injectable()
export class CanvaService {
  private readonly logger = new Logger(CanvaService.name);

  constructor(
    private configService: ConfigService,
    private googleService: GoogleService,
  ) {}

  handleAuthCallback(req: any, res: any): void {
    const { accessToken, refreshToken, profile } = req.user;

    // Read redirect from session
    let targetUrl = '';
    if (req.session?.canvaRedirect) {
      targetUrl = req.session.canvaRedirect;
      delete req.session.canvaRedirect; // Clean up
    }

    if (!targetUrl) {
      this.logger.error('No target URL for Canva redirect, cannot proceed');
      res.status(400).send('Missing redirect URL. Please start the OAuth flow from the application.');
      return;
    }

    const hasQuery = targetUrl.includes('?');

    res.redirect(
      `${targetUrl}${hasQuery ? '&' : '?'}canvaToken=${accessToken}&canvaRefreshToken=${refreshToken}&canvaName=${encodeURIComponent(
        profile.displayName,
      )}`,
    );
  }

  // ... (handleAuthCallback is fine)

  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
    const clientId = this.configService.get('CANVA_CLIENT_ID');
    const clientSecret = this.configService.get('CANVA_CLIENT_SECRET');
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', refreshToken);

    try {
      const res = await fetch('https://api.canva.com/rest/v1/oauth/token', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const data: any = await res.json();
      return { accessToken: data.access_token };
    } catch (error) {
      this.logger.error(`Error refreshing Canva token`, error);
      throw new UnauthorizedException('No se pudo refrescar el token de Canva');
    }
  }

  async exportDesignsToSheet(authHeader: string, data: { name: string; url: string }[]): Promise<{ url: string }> {
    const title = `Canva Designs - ${new Date().toLocaleString()}`;
    const url = await this.googleService.createSheet(authHeader, title, data);
    return { url };
  }

  async verifyToken(authHeader: string): Promise<{ valid: boolean; userId?: string }> {
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const res = await fetch('https://api.canva.com/rest/v1/users/me/profile', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('Token invalid');
      }

      const data: any = await res.json();
      return { valid: true, userId: data.id };
    } catch (error) {
      throw new UnauthorizedException('Token is invalid or expired');
    }
  }

  async generateDesignSync(authHeader: string, imageUrls: string[], patron: number[]): Promise<CanvaDesignResult> {
    if (!authHeader) throw new UnauthorizedException('Falta token');
    const token = authHeader.replace('Bearer ', '').trim();
    const TEMPLATE_ID = 'EAG_Wa4xSzg';
    const SLIDES_TOTAL = 35;

    this.logger.log(`starting sync design... images=${imageUrls.length}, patron=${patron.length}`);

    // 1. Identify Unique Images to Upload
    const uniqueIndices = new Set(patron);
    const neededIndices = Array.from(uniqueIndices).filter((i) => i >= 0 && i < imageUrls.length);
    const uploadedAssets = new Map<number, string>();

    // Upload sequentially to avoid aggressive rate limits or race conditions
    for (const idx of neededIndices) {
      try {
        const url = imageUrls[idx];
        const assetId = await this.processImageUpload(token, url, `img_${idx}`);
        uploadedAssets.set(idx, assetId);
      } catch (error) {
        this.logger.error(`Error uploading image index ${idx}: ${error.message}`);
      }
    }

    // 2. Construct Fill Data
    const fillData: Record<string, any> = {};
    for (let i = 0; i < SLIDES_TOTAL; i++) {
      const imageIndex = patron[i];
      if (imageIndex !== undefined && uploadedAssets.has(imageIndex)) {
        const slideNum = (i + 1).toString().padStart(2, '0');
        const assetId = uploadedAssets.get(imageIndex);
        fillData[`SLIDE_${slideNum}`] = { type: 'image', asset_id: assetId };
      }
    }

    // 3. Execute Autofill
    return await this.executeAutofill(token, TEMPLATE_ID, fillData);
  }

  private async processImageUpload(
    token: string,
    url: string,
    prefix: string,
    logCb?: (m: string) => void,
  ): Promise<string> {
    const buffer = await this.downloadImageFromUrl(url);
    const name = `${prefix}_${Date.now()}.jpg`;
    return await this.uploadAsset(token, buffer, name, logCb);
  }

  private async downloadImageFromUrl(url: string): Promise<Buffer> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Error descargando imagen: ${res.statusText}`);
    return Buffer.from(await res.arrayBuffer());
  }

  private async uploadAsset(
    token: string,
    fileBuffer: Buffer,
    fileName: string,
    logCb?: (m: string) => void,
  ): Promise<string> {
    try {
      const metadata = JSON.stringify({
        name_base64: Buffer.from(fileName).toString('base64'),
      });

      const bodyBlob = new Blob([new Uint8Array(fileBuffer)]);

      const startRes = await fetch('https://api.canva.com/rest/v1/asset-uploads', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/octet-stream',
          'Asset-Upload-Metadata': metadata,
          'Content-Length': fileBuffer.length.toString(),
        },
        body: bodyBlob,
      });

      if (!startRes.ok) {
        throw new Error(`Upload Init Failed: ${await startRes.text()}`);
      }

      const startData: any = await startRes.json();
      const jobId = startData.job.id;

      if (logCb) logCb('Subiendo a Canva, esperando...');
      return await this.pollJobStatus(token, jobId, 'asset-uploads');
    } catch (error) {
      this.logger.error(`❌ Error Upload Native: ${error.message}`);
      throw error;
    }
  }

  private async executeAutofill(
    token: string,
    templateId: string,
    dataFields: Record<string, any>,
  ): Promise<CanvaDesignResult> {
    const payload = {
      brand_template_id: templateId,
      title: `Auto Design ${new Date().toLocaleTimeString()}`,
      data: dataFields,
    };

    const res = await fetch('https://api.canva.com/rest/v1/autofills', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(`Canva Autofill Init Error: ${await res.text()}`);

    const data: any = await res.json();
    const jobId = data.job.id;

    return await this.pollJobStatus(token, jobId, 'autofills');
  }

  private async pollJobStatus(
    token: string,
    jobId: string,
    endpointType: 'asset-uploads' | 'autofills',
    attempts = 0,
  ): Promise<any> {
    if (attempts > 50) throw new Error(`Timeout esperando a Canva (${endpointType})`);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const res = await fetch(`https://api.canva.com/rest/v1/${endpointType}/${jobId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error(`Polling Failed (${endpointType}): ${await res.text()}`);

    const data: any = await res.json();
    const status = data.job.status;

    if (status === 'success') {
      if (endpointType === 'asset-uploads') {
        return data.job.asset.id as string;
      } else {
        return {
          id: data.job.result.design.id,
          url: data.job.result.design.url,
          thumbnail: data.job.result.design.thumbnail?.url,
        } as CanvaDesignResult;
      }
    } else if (status === 'failed') {
      throw new Error(`Canva Job Failed (${endpointType}): ${JSON.stringify(data.job.error)}`);
    } else {
      return this.pollJobStatus(token, jobId, endpointType, attempts + 1);
    }
  }

  private formatResults(results: any[], total: number): ProcessedResult {
    return {
      total,
      success: results.filter((r) => r.status === 'fulfilled').length,
      failed: results.filter((r) => r.status === 'rejected').length,
      designs: results.filter((r) => r.status === 'fulfilled').map((r) => r.value),
    };
  }
}
