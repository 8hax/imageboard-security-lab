import { z } from "zod";

// Espelham os schemas do backend (auth.controller): editar perfil, trocar senha, excluir conta.

export const updateProfileSchema = z.object({
    username: z.string().min(3, "Username deve ter no mínimo 3 caracteres"),
    email: z.email("Email inválido"),
});

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, "Senha atual obrigatória"),
    newPassword: z.string()
        .min(5, "Senha deve ter no mínimo 5 caracteres")
        .regex(/[A-Z]/, "Senha deve ter pelo menos 1 letra maiúscula")
        .regex(/[0-9]/, "Senha deve ter pelo menos 1 número")
        .regex(/[^a-zA-Z0-9]/, "Senha deve ter pelo menos 1 caractere especial"),
});

export const deleteAccountSchema = z.object({
    password: z.string().min(1, "Senha obrigatória"),
});
