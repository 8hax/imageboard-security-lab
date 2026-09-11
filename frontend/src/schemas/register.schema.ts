import { z } from "zod";
import { passwordRules } from "@/schemas/password.schema";

// Espelha o createSchema do backend (auth.controller) para dar o mesmo feedback antes
// de enviar. confirmarSenha é só do frontend (o backend não recebe esse campo).
export const registerSchema = z.object({
    username: z.string().min(3, "Username deve ter no mínimo 3 caracteres"),
    email: z.email("Email inválido"),
    password: passwordRules,
    confirmarSenha: z.string(),
}).refine((d) => d.password === d.confirmarSenha, {
    message: "As senhas não coincidem",
    path: ["confirmarSenha"],
});
