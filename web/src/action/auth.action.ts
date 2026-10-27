"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export interface AuthState {
    success: boolean;
    message: string;
}

export async function loginAction(previousState: AuthState, formData: FormData): Promise<AuthState> {

    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const rememberMe = formData.get('remember_me') === 'on';
    if (!email || !password) {
        return { success: false, message: 'Email dan password wajib diisi' };
    }
    try {
        const apiBase = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
        const res = await fetch(`${apiBase}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email,
                password,
            }),
        });
        const data = await res.json();
        if (!res.ok) {
            const body = await res.json();
            throw new Error(body.message || 'Login gagal');
        }

        const cookieStore = await cookies();
        cookieStore.set('access_token', data.data?.access_token || data.access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 15, // 15 menit
        });
    } catch (err: any) {
        return { success: false, message: err.message || 'Terjadi kesalahan saat login' };
    }
    redirect('/dashboard');
};
