"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { toast } from "sonner";
import "@/componentes/RegisterForm/RegisterForm.css";
import { registerSchema } from "@/schemas/register.schema";
import { register } from "@/services/auth.services";

export default function RegisterForm() {
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmarSenha, setConfirmarSenha] = useState("");
    const router = useRouter();

    const handleSubmit = async (e: React.SyntheticEvent) => {
        e.preventDefault();

        const result = registerSchema.safeParse({ username, email, password, confirmarSenha });
        if (!result.success) {
            toast.error(result.error.issues[0].message);
            return;
        }

        try {
            await register({ username, email, password });
            toast.success("Conta criada! Faça login para entrar.");
            router.push("/login"); // o backend só cria o usuário, não loga automaticamente
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Erro ao criar conta");
        }
    };

    return (
        <form onSubmit={handleSubmit} className="auth-form">
            <h1>Criar Conta</h1>

            <div className="div-input">
                <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username"
                    aria-label="Username"
                />
            </div>

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

            <div className="div-input">
                <input
                    type="password"
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    placeholder="Confirmar Senha"
                    aria-label="Confirmar Senha"
                />
            </div>

            <button type="submit">Criar Conta</button>

            <p className="auth-alt">
                Já tem conta? <Link href="/login">Entrar</Link>
            </p>
        </form>
    );
}
