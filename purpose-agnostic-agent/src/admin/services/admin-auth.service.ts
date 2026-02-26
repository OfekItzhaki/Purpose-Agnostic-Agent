import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AdminUser } from '../entities/admin-user.entity.js';
import { AuditLogService, ActionType } from './audit-log.service.js';

export interface AdminJwtPayload {
  sub: string;
  username: string;
  email: string;
  role: string;
}

export interface LoginResult {
  access_token: string;
  user: {
    id: string;
    username: string;
    email: string;
    role: string;
  };
}

@Injectable()
export class AdminAuthService {
  private readonly loginAttempts = new Map<
    string,
    { count: number; lastAttempt: Date }
  >();
  private readonly MAX_ATTEMPTS = 5;
  private readonly RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

  constructor(
    @InjectRepository(AdminUser)
    private readonly adminUserRepository: Repository<AdminUser>,
    private readonly jwtService: JwtService,
    @Inject(forwardRef(() => AuditLogService))
    private readonly auditLogService: AuditLogService,
  ) {}

  async login(
    username: string,
    password: string,
    ipAddress?: string,
  ): Promise<LoginResult> {
    // Check rate limiting
    this.checkRateLimit(username, ipAddress);

    // Find admin user
    const adminUser = await this.adminUserRepository.findOne({
      where: { username },
    });

    if (!adminUser) {
      this.recordFailedAttempt(username, ipAddress);

      // Log failed login attempt
      await this.auditLogService
        .logAuthEvent(null, ActionType.LOGIN_FAILED, ipAddress, {
          username,
          reason: 'User not found',
        })
        .catch(() => {}); // Don't fail login if audit log fails

      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      password,
      adminUser.password_hash,
    );

    if (!isPasswordValid) {
      this.recordFailedAttempt(username, ipAddress);

      // Log failed login attempt
      await this.auditLogService
        .logAuthEvent(adminUser.id, ActionType.LOGIN_FAILED, ipAddress, {
          username,
          reason: 'Invalid password',
        })
        .catch(() => {}); // Don't fail login if audit log fails

      throw new UnauthorizedException('Invalid credentials');
    }

    // Clear failed attempts on successful login
    this.clearFailedAttempts(username, ipAddress);

    // Generate JWT token
    const payload: AdminJwtPayload = {
      sub: adminUser.id,
      username: adminUser.username,
      email: adminUser.email,
      role: adminUser.role,
    };

    const access_token = this.jwtService.sign(payload);

    // Log successful login
    await this.auditLogService
      .logAuthEvent(adminUser.id, ActionType.LOGIN_SUCCESS, ipAddress, {
        username,
      })
      .catch(() => {}); // Don't fail login if audit log fails

    return {
      access_token,
      user: {
        id: adminUser.id,
        username: adminUser.username,
        email: adminUser.email,
        role: adminUser.role,
      },
    };
  }

  async validateToken(payload: AdminJwtPayload): Promise<AdminUser | null> {
    const adminUser = await this.adminUserRepository.findOne({
      where: { id: payload.sub },
    });

    return adminUser;
  }

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  private checkRateLimit(username: string, ipAddress?: string): void {
    const key = this.getRateLimitKey(username, ipAddress);
    const attempts = this.loginAttempts.get(key);

    if (!attempts) {
      return;
    }

    const timeSinceLastAttempt = Date.now() - attempts.lastAttempt.getTime();

    // Reset if window has passed
    if (timeSinceLastAttempt > this.RATE_LIMIT_WINDOW_MS) {
      this.loginAttempts.delete(key);
      return;
    }

    // Check if max attempts exceeded
    if (attempts.count >= this.MAX_ATTEMPTS) {
      const remainingTime = Math.ceil(
        (this.RATE_LIMIT_WINDOW_MS - timeSinceLastAttempt) / 1000 / 60,
      );
      throw new BadRequestException(
        `Too many login attempts. Please try again in ${remainingTime} minutes.`,
      );
    }
  }

  private recordFailedAttempt(username: string, ipAddress?: string): void {
    const key = this.getRateLimitKey(username, ipAddress);
    const attempts = this.loginAttempts.get(key);

    if (!attempts) {
      this.loginAttempts.set(key, { count: 1, lastAttempt: new Date() });
    } else {
      attempts.count += 1;
      attempts.lastAttempt = new Date();
    }
  }

  private clearFailedAttempts(username: string, ipAddress?: string): void {
    const key = this.getRateLimitKey(username, ipAddress);
    this.loginAttempts.delete(key);
  }

  private getRateLimitKey(username: string, ipAddress?: string): string {
    return ipAddress ? `${username}:${ipAddress}` : username;
  }
}
