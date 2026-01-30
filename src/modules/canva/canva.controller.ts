import { Controller, Get, Post, Body, UseGuards, Req, Res, Headers, Param, Sse } from '@nestjs/common';
import { GoogleService } from '../google/google.service';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { CanvaService } from './canva.service';
import { GenerateDesignDto } from './dto/generate-design.dto';

import { CanvaAuthGuard } from './canva-auth.guard';

@ApiTags('canva')
@Controller('canva')
export class CanvaController {
  constructor(private canvaService: CanvaService) {}

  @Get('auth')
  @ApiOperation({ summary: 'Initiate Canva OAuth flow' })
  @UseGuards(CanvaAuthGuard)
  canvaAuth() {}

  @Get('auth/callback')
  @ApiOperation({ summary: 'Canva OAuth callback' })
  @UseGuards(AuthGuard('canva'))
  async canvaAuthCallback(@Req() req: any, @Res() res: any) {
    return this.canvaService.handleAuthCallback(req, res);
  }

  @Post('auth/refresh')
  @ApiOperation({ summary: 'Refresh Canva Access Token' })
  async refresh(@Body() body: { refreshToken: string }) {
    return await this.canvaService.refreshAccessToken(body.refreshToken);
  }

  @Get('auth/verify')
  @ApiOperation({ summary: 'Verify Canva token status' })
  @ApiBearerAuth('access-token')
  @ApiHeader({ name: 'authorization' })
  @ApiResponse({ status: 200, description: 'Token is valid' })
  @ApiResponse({ status: 401, description: 'Token is invalid or expired' })
  async verifyToken(@Headers('authorization') authHeader: string) {
    return await this.canvaService.verifyToken(authHeader);
  }

  @Post('generate')
  @ApiOperation({ summary: 'Generate a single design synchronously' })
  @ApiBearerAuth('access-token')
  @ApiResponse({ status: 201, description: 'Design generated' })
  async generate(@Headers('authorization') authHeader: string, @Body() dto: GenerateDesignDto) {
    return await this.canvaService.generateDesignSync(authHeader, dto.imageUrls, dto.patron);
  }

  @Post('export')
  @ApiOperation({ summary: 'Export results to Google Sheet' })
  @ApiBearerAuth('access-token')
  @ApiResponse({ status: 201, description: 'Sheet created' })
  async exportSheet(
    @Headers('authorization') authHeader: string,
    @Body() body: { data: { name: string; url: string }[] },
  ) {
    return await this.canvaService.exportDesignsToSheet(authHeader, body.data);
  }
}
