import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../config/prisma.service';
import { UserDto, AuthResponseDto, SubscriptionTier } from '@clustro/shared';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(data: {
    name: string;
    username: string;
    email: string;
    phone?: string | null;
    password: string;
  }): Promise<AuthResponseDto> {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: data.email.toLowerCase() },
          { username: data.username.toLowerCase() },
        ],
      },
    });

    if (existing) {
      if (existing.email.toLowerCase() === data.email.toLowerCase()) {
        throw new ConflictException('An account with this email already exists');
      }
      throw new ConflictException('Username is already taken');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await this.prisma.user.create({
      data: {
        name: data.name.trim(),
        username: data.username.toLowerCase().trim(),
        email: data.email.toLowerCase().trim(),
        phone: data.phone?.trim() || null,
        passwordHash,
        defaultCurrency: 'INR',
        subscriptionTier: SubscriptionTier.FREE,
      },
    });

    // Check if there are any offline/placeholder members that match this user's email or username
    // and link them automatically
    await this.linkMatchingPlaceholderMembers(user.id, user.email, user.username);

    const accessToken = this.generateAccessToken(user);

    return {
      user: this.mapUserToDto(user),
      accessToken,
    };
  }

  async login(data: { emailOrUsername: string; password: string }): Promise<AuthResponseDto> {
    const query = data.emailOrUsername.toLowerCase().trim();
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: query }, { username: query }],
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email/username or password');
    }

    const isMatch = await bcrypt.compare(data.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email/username or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Your account has been deactivated');
    }

    const accessToken = this.generateAccessToken(user);

    return {
      user: this.mapUserToDto(user),
      accessToken,
    };
  }

  async generateRefreshToken(userId: string): Promise<string> {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(rawToken, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    return `${userId}:${rawToken}`;
  }

  async refreshAccessToken(combinedToken: string): Promise<{ accessToken: string; user: UserDto }> {
    if (!combinedToken || !combinedToken.includes(':')) {
      throw new UnauthorizedException('Invalid refresh token format');
    }

    const [userId, rawToken] = combinedToken.split(':');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    const tokens = await this.prisma.refreshToken.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    let validTokenRecord = null;
    for (const t of tokens) {
      const match = await bcrypt.compare(rawToken, t.tokenHash);
      if (match) {
        validTokenRecord = t;
        break;
      }
    }

    if (!validTokenRecord) {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    const accessToken = this.generateAccessToken(user);
    return {
      accessToken,
      user: this.mapUserToDto(user),
    };
  }

  async logout(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async linkMatchingPlaceholderMembers(userId: string, email: string, username: string) {
    try {
      await this.prisma.clusterMember.updateMany({
        where: {
          isPlaceholder: true,
          userId: null,
          OR: [
            { email: { equals: email, mode: 'insensitive' } },
            { displayName: { equals: username, mode: 'insensitive' } },
          ],
        },
        data: {
          userId,
          isPlaceholder: false,
        },
      });
    } catch (e) {
      // Non-blocking linking
    }
  }

  private generateAccessToken(user: { id: string; username: string; email: string }): string {
    return this.jwtService.sign(
      {
        sub: user.id,
        username: user.username,
        email: user.email,
      },
      {
        secret: process.env.JWT_SECRET || 'clustro_jwt_secret_production_key_random_2026_xyz',
        expiresIn: '15m',
      },
    );
  }

  mapUserToDto(user: any): UserDto {
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      username: user.username,
      avatarUrl: user.avatarUrl,
      defaultCurrency: user.defaultCurrency || 'INR',
      subscriptionTier: user.subscriptionTier as SubscriptionTier,
      createdAt: user.createdAt?.toISOString ? user.createdAt.toISOString() : String(user.createdAt),
    };
  }
}
