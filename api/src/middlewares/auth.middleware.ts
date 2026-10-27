import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '../generated/prisma/client';
import { env } from '../config/env';
import { AppError } from '../common/errors';

interface JwtAccessPayload {
    sub: string;
    role: Role;
    email: string;
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new AppError(401, 'Token autentikasi tidak ditemukan'));
    }

    const token = authHeader.slice(7);
    try {
        const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtAccessPayload;
        req.user = {
            id: BigInt(decoded.sub),
            role: decoded.role,
            email: decoded.email,
        };
        next();
    } catch {
        next(new AppError(401, 'Access token tidak valid atau sudah kedaluwarsa'));
    }
}

export function requireRoles(allowedRoles: Role[]) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        if (!req.user) {
            return next(new AppError(401, 'Unauthenticated'));
        }
        if (!allowedRoles.includes(req.user.role)) {
            return next(new AppError(403, 'Anda tidak memiliki hak akses untuk fitur ini'));
        }
        next();
    };
}