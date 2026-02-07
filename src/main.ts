import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupTransformer } from './core/transformer.core';
import { setupSwagger } from './core/swagger.core';
import { setupSession } from './core/session.core';
import { setupCors } from './core/cors.core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  setupSession(app);
  setupTransformer(app);
  setupSwagger(app);
  setupCors(app);

  // Servir archivos estáticos desde la carpeta view
  app.useStaticAssets(join(__dirname, 'view'));

  await app.listen(3000);
}
bootstrap();
