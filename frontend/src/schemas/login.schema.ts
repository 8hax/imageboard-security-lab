import { z } from "zod";

// Espelha o loginSchema do backend (auth.controller): valida email e exige senha não-vazia.
export const loginSchema = z.object({
    email: z.email("Email inválido"),
    password: z.string().min(1, "Senha obrigatória"),
});
