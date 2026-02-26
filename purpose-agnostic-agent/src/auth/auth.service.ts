import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';

export interface JwtPayload {
  sub: string;
  email: string;
  role: 'admin' | 'user';
}

export interface AuthUser {
  id: string;
  email: string;
  role: 'admin' | 'user';
}

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async validateApiKey(apiKey: string): Promise<AuthUser | null> {
    // In production, validate against database
    // For now, check against environment variable
    const validApiKeys = (process.env.API_KEYS || '')
      .split(',')
      .filter(Boolean);

    if (!validApiKeys.includes(apiKey)) {
      return null;
    }

    // Return a service account user
    return {
      id: 'api-key-user',
      email: 'api@service.local',
      role: 'user',
    };
  }

  async validateJwt(payload: JwtPayload): Promise<AuthUser> {
    // In production, validate against database
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }

  async generateToken(user: AuthUser): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return this.jwtService.sign(payload);
  }

  generateApiKey(): string {
    return `pak_${crypto.randomBytes(32).toString('hex')}`;
  }
}
