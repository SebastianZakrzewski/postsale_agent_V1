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
