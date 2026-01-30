import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupTransformer } from './core/transformer.core';
import { setupSwagger } from './core/swagger.core';
import { setupSession } from './core/session.core';
import { setupCors } from './core/cors.core';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  setupSession(app);
  setupTransformer(app);
  setupSwagger(app);
  setupCors(app);

  await app.listen(3000);
}
bootstrap();
