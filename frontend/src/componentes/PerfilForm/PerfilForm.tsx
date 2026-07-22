"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Me } from "@/tipos/auth";
import {
    updateProfileSchema,
    changePasswordSchema,
    deleteAccountSchema,
} from "@/schemas/perfil.schema";
import {
    updateProfile,
    changePassword,
    deleteAccount,
} from "@/services/auth.services";
import "@/componentes/PerfilForm/PerfilForm.css";

interface PerfilFormProps {
    me: Me;
}

// Client component: cada seção consome uma rota /auth/me* via cookie httpOnly
// (credentials:"include" nos serviços). Validação com zod, igual aos forms de auth.
export default function PerfilForm({ me }: PerfilFormProps) {
    const router = useRouter();

    // Editar perfil (prefill com os dados atuais)
    const [username, setUsername] = useState(me.username);
    const [email, setEmail] = useState(me.email);
    const [salvandoPerfil, setSalvandoPerfil] = useState(false);

    // Trocar senha
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [salvandoSenha, setSalvandoSenha] = useState(false);

    // Excluir conta
    const [senhaExclusao, setSenhaExclusao] = useState("");
    const [excluindo, setExcluindo] = useState(false);

    async function handleUpdateProfile(e: React.SyntheticEvent) {
        e.preventDefault();

        const result = updateProfileSchema.safeParse({ username, email });
        if (!result.success) {
            toast.error(result.error.issues[0].message);
            return;
        }

        setSalvandoPerfil(true);
        try {
            const atualizado = await updateProfile(result.data);
            setUsername(atualizado.username);
            setEmail(atualizado.email);
            toast.success("Perfil atualizado");
            router.refresh(); // atualiza dados lidos no server (ex.: Header)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Erro ao atualizar o perfil");
        } finally {
            setSalvandoPerfil(false);
        }
    }

    async function handleChangePassword(e: React.SyntheticEvent) {
        e.preventDefault();

        const result = changePasswordSchema.safeParse({ currentPassword, newPassword });
        if (!result.success) {
            toast.error(result.error.issues[0].message);
            return;
        }

        setSalvandoSenha(true);
        try {
            await changePassword(result.data);
            setCurrentPassword("");
            setNewPassword("");
            toast.success("Senha alterada");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Erro ao trocar a senha");
        } finally {
            setSalvandoSenha(false);
        }
    }

    async function handleDeleteAccount(e: React.SyntheticEvent) {
        e.preventDefault();

        const result = deleteAccountSchema.safeParse({ password: senhaExclusao });
        if (!result.success) {
            toast.error(result.error.issues[0].message);
            return;
        }

        if (
            !confirm(
                'Excluir sua conta permanentemente? Seus posts serão mantidos como "[deletado]". Essa ação não pode ser desfeita.'
            )
        ) {
            return;
        }

        setExcluindo(true);
        try {
            await deleteAccount(result.data);
            toast.success("Conta excluída");
            router.push("/login"); // o backend já limpou o cookie
            router.refresh();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Erro ao excluir a conta");
            setExcluindo(false);
        }
    }

    return (
        <div className="perfil-form">
            {/* Editar perfil */}
            <section className="perfil-card">
                <h2>Editar perfil</h2>
                <form onSubmit={handleUpdateProfile}>
                    <label>
                        <span>Username</span>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Username"
                            aria-label="Username"
                        />
                    </label>
                    <label>
                        <span>Email</span>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email"
                            aria-label="Email"
                        />
                    </label>
                    <button type="submit" disabled={salvandoPerfil}>
                        {salvandoPerfil ? "Salvando..." : "Salvar alterações"}
                    </button>
                </form>
            </section>

            {/* Trocar senha */}
            <section className="perfil-card">
                <h2>Trocar senha</h2>
                <form onSubmit={handleChangePassword}>
                    <label>
                        <span>Senha atual</span>
                        <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="Senha atual"
                            aria-label="Senha atual"
                        />
                    </label>
                    <label>
                        <span>Nova senha</span>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Nova senha"
                            aria-label="Nova senha"
                        />
                    </label>
                    <p className="perfil-hint">
                        Mínimo 5 caracteres, com 1 maiúscula, 1 número e 1 caractere especial.
                    </p>
                    <button type="submit" disabled={salvandoSenha}>
                        {salvandoSenha ? "Salvando..." : "Alterar senha"}
                    </button>
                </form>
            </section>

            {/* Excluir conta (zona de perigo) */}
            <section className="perfil-card perfil-danger">
                <h2>Excluir conta</h2>
                <p className="perfil-hint">
                    Confirme com sua senha. Seus posts serão mantidos de forma anônima como
                    &quot;[deletado]&quot;. Essa ação é permanente.
                </p>
                <form onSubmit={handleDeleteAccount}>
                    <label>
                        <span>Senha</span>
                        <input
                            type="password"
                            value={senhaExclusao}
                            onChange={(e) => setSenhaExclusao(e.target.value)}
                            placeholder="Sua senha"
                            aria-label="Senha para excluir a conta"
                        />
                    </label>
                    <button type="submit" className="perfil-btn-danger" disabled={excluindo}>
                        {excluindo ? "Excluindo..." : "Excluir minha conta"}
                    </button>
                </form>
            </section>
        </div>
    );
}
