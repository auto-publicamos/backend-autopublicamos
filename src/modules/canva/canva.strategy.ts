import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-oauth2';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CanvaProfile, CanvaUser } from './models/canva.model';

@Injectable()
export class CanvaStrategy extends PassportStrategy(Strategy, 'canva') {
  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get('CANVA_CLIENT_ID'),
      clientSecret: configService.get('CANVA_CLIENT_SECRET'),
      callbackURL: configService.get('CANVA_CALLBACK_URL'),
      authorizationURL: 'https://www.canva.com/api/oauth/authorize',
      tokenURL: 'https://api.canva.com/rest/v1/oauth/token',
      scope: [
        'design:content:read',
        'design:content:write',
        'design:meta:read',
        'brandtemplate:content:read',
        'brandtemplate:meta:read',
        'profile:read',
        'asset:write',
        'asset:read',
      ],
      pkce: true,
      state: true,
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any, done: Function) {
    try {
      const userProfile = await this.getUserProfile(accessToken);

      const user: CanvaUser = {
        accessToken,
        refreshToken,
        profile: userProfile,
      };

      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }

  private async getUserProfile(accessToken: string): Promise<CanvaProfile> {
    try {
      const response = await fetch('https://api.canva.com/rest/v1/users/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        throw new Error(`Canva API Error: ${response.statusText}`);
      }

      const data = (await response.json()) as any;

      return {
        displayName: data.team_user?.display_name || 'Papu Pro',
        id: data.team_user?.user_id,
      };
    } catch (error) {
      console.warn('No se pudo obtener el perfil, pero tenemos el token.');
      return { displayName: 'Admin' };
    }
  }
}
