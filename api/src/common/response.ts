import { Response } from 'express';

export function serializeBigInt<T>(data: T): T {
    return JSON.parse(
        JSON.stringify(data, (_, value) => (typeof value === 'bigint' ? Number(value) : value))
    );
}

export function sendSuccess<T>(
    res: Response,
    data: T,
    message = 'OK',
    statusCode = 200,
    meta?: { page: number; per_page: number; total: number; total_pages: number }
): Response {
    const payload: Record<string, unknown> = {
        success: true,
        message,
        data: serializeBigInt(data),
    };
    if (meta) {
        payload.meta = meta;
    }
    return res.status(statusCode).json(payload);
}