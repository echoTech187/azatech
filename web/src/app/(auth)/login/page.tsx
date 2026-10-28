'use client';

import { useState } from 'react';
import { useAuth } from '@/src/application/hooks/use-auth';

export default function LoginPage() {
    const { login, isLoading, error, user } = useAuth({ redirectIfAuthenticated: true });
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    if (user) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
                <div className="bg-white rounded-xl shadow-lg border p-8 max-w-md w-full text-center space-y-3">
                    <div className="inline-block animate-spin text-3xl">⏳</div>
                    <h2 className="text-lg font-bold text-slate-800">Sesi Anda Aktif</h2>
                    <p className="text-sm text-slate-500">
                        Anda telah login sebagai <strong>{user.name}</strong>. Sedang mengalihkan ke dashboard...
                    </p>
                </div>
            </main>
        );
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        try {
            await login(email, password);
        } catch {
            // Error otomatis dikelola oleh useAuth dan dirender ke alert UI
        }
    };

    return (
        <main className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg border p-8 space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Login Azatech Shop</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Sistem Manajemen Order & Inventori (Role: Admin / Cashier)
                    </p>
                </div>

                <div className="flex gap-2 text-xs">
                    <button
                        type="button"
                        onClick={() => {
                            setEmail('ekosuesanto25@gmail.com');
                            setPassword('Azatech@2026!');
                        }}
                        className="flex-1 py-1.5 px-3 rounded border bg-slate-50 hover:bg-slate-100 font-medium cursor-pointer"
                    >
                        Isi Akun Admin
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setEmail('rishamoena23@gmail.com');
                            setPassword('Azatech@2026!');
                        }}
                        className="flex-1 py-1.5 px-3 rounded border bg-slate-50 hover:bg-slate-100 font-medium cursor-pointer"
                    >
                        Isi Akun Cashier
                    </button>
                </div>

                {error && (
                    <div role="alert" className="p-3 rounded bg-rose-50 text-rose-700 text-xs font-medium border border-rose-200">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                            Email
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            placeholder="nama@email.com"
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                            Password
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            placeholder="••••••••"
                        />
                    </div>
                    
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-400 text-white font-semibold py-2.5 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Memverifikasi...' : 'Masuk ke Sistem'}
                    </button>
                </form>
            </div>
        </main>
    );
}
