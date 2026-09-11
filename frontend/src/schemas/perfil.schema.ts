import { z } from "zod";
import { passwordRules } from "@/schemas/password.schema";

// Espelham os schemas do backend (auth.controller): editar perfil, trocar senha, excluir conta.

export const updateProfileSchema = z.object({
    username: z.string().min(3, "Username deve ter no mínimo 3 caracteres"),
    email: z.email("Email inválido"),
});

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, "Senha atual obrigatória"),
    newPassword: passwordRules,
});

export const deleteAccountSchema = z.object({
    password: z.string().min(1, "Senha obrigatória"),
});
