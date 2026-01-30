import { Module } from '@nestjs/common';
import { GoogleController } from './google.controller';
import { GoogleService } from './google.service';
import { GoogleStrategy } from './google.strategy';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule, PassportModule],
  controllers: [GoogleController],
  providers: [GoogleService, GoogleStrategy],
  exports: [GoogleService],
})
export class GoogleModule {}
