import { Controller, Post, Body, Ip } from '@nestjs/common';
import {
  AdminAuthService,
  LoginResult,
} from '../services/admin-auth.service.js';
import { LoginDto } from '../dto/login.dto.js';

@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Ip() ipAddress: string,
  ): Promise<LoginResult> {
    return this.adminAuthService.login(
      loginDto.username,
      loginDto.password,
      ipAddress,
    );
  }
}
