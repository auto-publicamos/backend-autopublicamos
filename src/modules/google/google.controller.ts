import { Controller, Get, Req, Res, UseGuards, Query, Headers, Post, Body, Param } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { GoogleService } from './google.service';
import { GoogleDriveImagesDto } from './dto/google-drive-images.dto';
import { GoogleDriveFoldersDto } from './dto/google-drive-folders.dto';

import { GoogleAuthGuard } from './google-auth.guard';

@ApiTags('google')
@Controller('google')
export class GoogleController {
  constructor(private googleService: GoogleService) {}

  @Get('auth')
  @ApiOperation({ summary: 'Initiate Google OAuth flow' })
  @UseGuards(GoogleAuthGuard)
  googleAuth() {}

  @Get('auth/callback')
  @ApiOperation({ summary: 'Google OAuth callback' })
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req: any, @Res() res: any) {
    return this.googleService.handleAuthRedirect(req, res);
  }

  @Post('auth/refresh')
  @ApiOperation({ summary: 'Refresh Google Access Token' })
  async refresh(@Body() body: { refreshToken: string }) {
    return await this.googleService.refreshAccessToken(body.refreshToken);
  }

  @Get('auth/verify')
  @ApiOperation({ summary: 'Verify Google token status' })
  @ApiBearerAuth('access-token')
  @ApiHeader({ name: 'authorization' })
  @ApiResponse({ status: 200, description: 'Token is valid' })
  @ApiResponse({ status: 401, description: 'Token is invalid or expired' })
  async verifyToken(@Headers('authorization') authHeader: string) {
    return await this.googleService.verifyToken(authHeader);
  }

  @Get('drive/images')
  @ApiOperation({ summary: 'List images from Google Drive folder' })
  @ApiBearerAuth('access-token')
  @ApiHeader({ name: 'authorization' })
  @ApiResponse({ status: 200 })
  getImages(@Headers('authorization') authHeader: string, @Query() query: GoogleDriveImagesDto) {
    return this.googleService.listImages(authHeader, query.folderId, query.pageToken, query.pageSize);
  }

  @Get('drive/folders')
  @ApiOperation({ summary: 'List subfolders from Google Drive folder' })
  @ApiBearerAuth('access-token')
  @ApiHeader({ name: 'authorization' })
  @ApiResponse({ status: 200 })
  getFolders(@Headers('authorization') authHeader: string, @Query() query: GoogleDriveFoldersDto) {
    // For folders, we only support pageSize control for now, defaulting to 1000 in service if not provided
    return this.googleService.listFolders(authHeader, query.folderId, query.pageSize);
  }

  @Get('drive/docs')
  @ApiOperation({ summary: 'List Google Docs from Google Drive folder' })
  @ApiBearerAuth('access-token')
  @ApiHeader({ name: 'authorization' })
  @ApiResponse({ status: 200 })
  getDocs(@Headers('authorization') authHeader: string, @Query() query: GoogleDriveFoldersDto) {
    return this.googleService.listDocs(authHeader, query.folderId, query.pageToken, query.pageSize);
  }

  @Get('drive/docs/:docId/content')
  @ApiOperation({ summary: 'Get Google Doc content' })
  @ApiBearerAuth('access-token')
  @ApiHeader({ name: 'authorization' })
  @ApiResponse({ status: 200 })
  getDocContent(@Headers('authorization') authHeader: string, @Param('docId') docId: string) {
    return this.googleService.getDocContent(authHeader, docId);
  }
}
