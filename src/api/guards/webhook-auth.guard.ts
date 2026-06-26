import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class WebhookAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const secret = process.env.N8N_WEBHOOK_SECRET?.trim();
    if (!secret) {
      if (process.env.NODE_ENV === 'production') {
        throw new UnauthorizedException('Webhook secret not configured');
      }
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers['x-webhook-secret'];
    const provided = Array.isArray(header) ? header[0] : header;

    if (provided !== secret) {
      throw new UnauthorizedException('Invalid webhook secret');
    }

    return true;
  }
}
