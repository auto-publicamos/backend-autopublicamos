import { GoogleModule } from '../google/google.module';
import { Module } from '@nestjs/common';
import { CanvaController } from './canva.controller';
import { CanvaService } from './canva.service';
import { CanvaStrategy } from './canva.strategy';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [ConfigModule, PassportModule, GoogleModule],
  controllers: [CanvaController],
  providers: [CanvaService, CanvaStrategy],
})
export class CanvaModule {}
