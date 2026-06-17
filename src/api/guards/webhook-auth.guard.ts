import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class WebhookAuthGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    return true;
  }
}
