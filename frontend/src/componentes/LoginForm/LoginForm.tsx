"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { toast } from "sonner";
import "@/componentes/LoginForm/LoginForm.css";
import { loginSchema } from "@/schemas/login.schema";
import { login } from "@/services/auth.services";

export default function LoginForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const router = useRouter();

    const handleSubmit = async (e: React.SyntheticEvent) => {
        e.preventDefault();

        const result = loginSchema.safeParse({ email, password });
        if (!result.success) {
            toast.error(result.error.issues[0].message);
            return;
        }

        try {
            await login({ email, password });
            toast.success("Login realizado com sucesso");
            router.push("/");
            router.refresh(); // atualiza o Header (que lê o cookie no server)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Usuário ou senha inválidos");
        }
    };

    return (
        <form onSubmit={handleSubmit} className="auth-form">
            <h1>Entrar</h1>

            <div className="div-input">
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    aria-label="Email"
                />
            </div>

            <div className="div-input">
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Senha"
                    aria-label="Senha"
                />
            </div>

            <button type="submit">Entrar</button>

            <p className="auth-alt">
                Não tem conta? <Link href="/create">Criar conta</Link>
            </p>
        </form>
    );
}
