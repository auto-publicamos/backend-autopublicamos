import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GoogleModule } from './modules/google/google.module';
import { CanvaModule } from './modules/canva/canva.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    GoogleModule,
    CanvaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
