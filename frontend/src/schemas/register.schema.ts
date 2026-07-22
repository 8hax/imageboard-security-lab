import { z } from "zod";

// Espelha o createSchema do backend (auth.controller) para dar o mesmo feedback antes
// de enviar. confirmarSenha é só do frontend (o backend não recebe esse campo).
export const registerSchema = z.object({
    username: z.string().min(3, "Username deve ter no mínimo 3 caracteres"),
    email: z.email("Email inválido"),
    password: z.string()
        .min(5, "Senha deve ter no mínimo 5 caracteres")
        .regex(/[A-Z]/, "Senha deve ter pelo menos 1 letra maiúscula")
        .regex(/[0-9]/, "Senha deve ter pelo menos 1 número")
        .regex(/[^a-zA-Z0-9]/, "Senha deve ter pelo menos 1 caractere especial"),
    confirmarSenha: z.string(),
}).refine((d) => d.password === d.confirmarSenha, {
    message: "As senhas não coincidem",
    path: ["confirmarSenha"],
});
