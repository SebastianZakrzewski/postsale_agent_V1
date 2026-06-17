import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../app/modules/app.module';

describe('HealthController (integration)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('Given NestJS app bootstrapped When GET /health Then 200 OK', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok' });
  });
});
