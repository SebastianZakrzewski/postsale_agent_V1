import { UnauthorizedException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common/interfaces';
import { WebhookAuthGuard } from '../../api/guards/webhook-auth.guard';

function buildContext(headers: Record<string, string> = {}): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
  } as ExecutionContext;
}

describe('WebhookAuthGuard', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalSecret = process.env.N8N_WEBHOOK_SECRET;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalSecret === undefined) {
      delete process.env.N8N_WEBHOOK_SECRET;
    } else {
      process.env.N8N_WEBHOOK_SECRET = originalSecret;
    }
  });

  it('allows requests in non-production when secret is unset', () => {
    delete process.env.N8N_WEBHOOK_SECRET;
    process.env.NODE_ENV = 'test';

    const guard = new WebhookAuthGuard();
    expect(guard.canActivate(buildContext())).toBe(true);
  });

  it('rejects requests in production when secret is unset', () => {
    delete process.env.N8N_WEBHOOK_SECRET;
    process.env.NODE_ENV = 'production';

    const guard = new WebhookAuthGuard();
    expect(() => guard.canActivate(buildContext())).toThrow(
      UnauthorizedException,
    );
  });
});
