import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class CanvaAuthGuard extends AuthGuard('canva') {
  getAuthenticateOptions(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const redirect = req.query.redirect;

    // Store redirect in session since Passport overwrites state with PKCE
    if (redirect && req.session) {
      req.session.canvaRedirect = redirect;
    }

    return {};
  }
}
