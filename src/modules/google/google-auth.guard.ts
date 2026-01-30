import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  getAuthenticateOptions(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const redirect = req.query.redirect;

    // Store redirect in session
    if (redirect && req.session) {
      req.session.googleRedirect = redirect;
    }

    return {
      accessType: 'offline',
      prompt: 'consent',
    };
  }
}
