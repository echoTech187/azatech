import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { AppError } from '../../common/errors';

export class AuthService {
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private signAccessToken(user: { id: bigint; role: string; email: string }): string {
    return jwt.sign(
      { sub: user.id.toString(), role: user.role, email: user.email },
      env.JWT_ACCESS_SECRET,
      { expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
    );
  }

  async login(email: string, passwordPlain: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError(401, 'Email atau password salah');
    }

    const valid = await bcrypt.compare(passwordPlain, user.password);
    if (!valid) {
      throw new AppError(401, 'Email atau password salah');
    }

    const accessToken = this.signAccessToken(user);
    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + env.JWT_REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: {
        user_id: user.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
      },
    });

    return {
      access_token: accessToken,
      refresh_token: rawRefreshToken,
      user: {
        id: Number(user.id),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async refresh(rawRefreshToken: string) {
    const tokenHash = this.hashToken(rawRefreshToken);
    const stored = await prisma.refreshToken.findUnique({
      where: { token_hash: tokenHash },
      include: { user: true },
    });

    if (!stored) {
      throw new AppError(401, 'Refresh token tidak ditemukan');
    }

    // Reuse detection: jika refresh token lama yang sudah di-revoke dipakai ulang, cabut semua sesi user!
    if (stored.revoked_at !== null) {
      await prisma.refreshToken.updateMany({
        where: { user_id: stored.user_id, revoked_at: null },
        data: { revoked_at: new Date() },
      });
      throw new AppError(401, 'Deteksi penggunaan ulang refresh token lama. Seluruh sesi telah dicabut.');
    }

    if (stored.expires_at < new Date()) {
      throw new AppError(401, 'Refresh token telah kedaluwarsa');
    }

    const newRawRefreshToken = crypto.randomBytes(40).toString('hex');
    const newTokenHash = this.hashToken(newRawRefreshToken);
    const expiresAt = new Date(Date.now() + env.JWT_REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

    await prisma.$transaction(async (tx) => {
      const created = await tx.refreshToken.create({
        data: {
          user_id: stored.user_id,
          token_hash: newTokenHash,
          expires_at: expiresAt,
        },
      });

      // Atomic conditional revoke (mencegah race condition jika 2 request refresh datang bersamaan)
      const revoked = await tx.refreshToken.updateMany({
        where: { id: stored.id, revoked_at: null },
        data: {
          revoked_at: new Date(),
          replaced_by_id: created.id,
        },
      });

      if (revoked.count === 0) {
        await tx.refreshToken.updateMany({
          where: { user_id: stored.user_id, revoked_at: null },
          data: { revoked_at: new Date() },
        });
        throw new AppError(401, "Deteksi penggunaan ulang refresh token secara paralel. Seluruh sesi dicabut.");
      }
    });

    const accessToken = this.signAccessToken(stored.user);

    return {
      access_token: accessToken,
      refresh_token: newRawRefreshToken,
      user: {
        id: Number(stored.user.id),
        name: stored.user.name,
        email: stored.user.email,
        role: stored.user.role,
      },
    };
  }

  async logout(userId: bigint, rawRefreshToken?: string) {
    if (rawRefreshToken) {
      const tokenHash = this.hashToken(rawRefreshToken);
      await prisma.refreshToken.updateMany({
        where: { user_id: userId, token_hash: tokenHash, revoked_at: null },
        data: { revoked_at: new Date() },
      });
    } else {
      await prisma.refreshToken.updateMany({
        where: { user_id: userId, revoked_at: null },
        data: { revoked_at: new Date() },
      });
    }
  }

  async getProfile(userId: bigint) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError(404, 'User tidak ditemukan');
    }
    return {
      id: Number(user.id),
      name: user.name,
      email: user.email,
      role: user.role,
      created_at: user.created_at,
    };
  }
}

export const authService = new AuthService();