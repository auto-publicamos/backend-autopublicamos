import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class CanvaAuthGuard extends AuthGuard('canva') {
  getAuthenticateOptions(context: ExecutionContext) {
    return {};
  }
}
