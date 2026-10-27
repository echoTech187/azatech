'use client';

import { useActionState, useState } from 'react';
import { AuthState, loginAction } from '@/src/action/auth.action';


const initialState: AuthState = {
    success: false,
    message: '',
};

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [state, formAction, isPending] = useActionState(loginAction, initialState);

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
                        className="flex-1 py-1.5 px-3 rounded border bg-slate-50 hover:bg-slate-100 font-medium"
                    >
                        Isi Akun Admin
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setEmail('rishamoena23@gmail.com');
                            setPassword('Azatech@2026!');
                        }}
                        className="flex-1 py-1.5 px-3 rounded border bg-slate-50 hover:bg-slate-100 font-medium"
                    >
                        Isi Akun Cashier
                    </button>
                </div>

                {state.success && (
                    <div role="alert" className="p-3 rounded bg-green-50 text-green-700 text-xs font-medium">
                        {state.message}
                    </div>
                )}

                {!state.success && state.message && (
                    <div role="alert" className="p-3 rounded bg-rose-50 text-rose-700 text-xs font-medium">
                        {state.message}
                    </div>
                )}
                <form action={formAction} className="space-y-4">
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
                            className="w-full border rounded-lg px-3 py-2 text-sm"
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
                            className="w-full border rounded-lg px-3 py-2 text-sm"
                        />
                    </div>
                    
                    <button
                        type="submit"
                        disabled={isPending}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-400 text-white font-semibold py-2.5 rounded-lg"
                    >
                        {isPending ? 'Memverifikasi...' : 'Masuk ke Sistem'}
                    </button>
                </form>
            </div>
        </main>
    );
}
