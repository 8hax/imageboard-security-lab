import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { z } from 'zod';

const authService = new AuthService();

// validação

// Regras de senha reaproveitadas no cadastro e na troca de senha.
const passwordRules = z.string()
  .min(5, 'Senha deve ter no mínimo 5 caracteres')
  .regex(/[A-Z]/, 'Senha deve ter pelo menos 1 letra maiúscula')
  .regex(/[0-9]/, 'Senha deve ter pelo menos 1 número')
  .regex(/[^a-zA-Z0-9]/, 'Senha deve ter pelo menos 1 caractere especial');

const createSchema = z.object({
  username: z.string().min(3, 'Username deve ter no mínimo 3 caracteres'),
  email: z.email('Email inválido'),
  password: passwordRules,
});

const loginSchema = z.object({
  email: z.email('Email inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
});

// Editar perfil: username e/ou email (pelo menos um).
const updateProfileSchema = z.object({
  username: z.string().min(3, 'Username deve ter no mínimo 3 caracteres').optional(),
  email: z.email('Email inválido').optional(),
}).refine((d) => d.username !== undefined || d.email !== undefined, {
  message: 'Informe username ou email para atualizar',
});

// Trocar senha: exige a senha atual + nova senha nas regras.
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual obrigatória'),
  newPassword: passwordRules,
});

// Excluir conta: exige a senha atual como confirmação.
const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Senha obrigatória'),
});

export class AuthController {

  async create(req: Request, res: Response) {
    try {
      const parsed = createSchema.safeParse(req.body)

      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message })
        return
      }

      const { username, email, password } = parsed.data
      const user = await authService.create(username, email, password)

      res.status(201).json(user)
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Erro ao criar usuário'
      })
    }
  };

  async login(req: Request, res: Response) {
    try {
      const parsed = loginSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message })
        return
      }

      const { email, password } = parsed.data;
      const resposta = await authService.login(email, password);

      // maxAge em ms — 5h para bater com o expiresIn do JWT
      res.cookie('token', resposta.token, {
        httpOnly: true,
        secure: false,     // true apenas quando tivermos o https
        sameSite: 'lax',
        maxAge: 5 * 60 * 60 * 1000,
      })

      res.json({ success: true })
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Erro ao fazer login'
      })
    }
  };

  async logout(req: Request, res: Response) {
  try {
    res.clearCookie('token')
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao fazer logout' });
  }
};

 async me(req: Request, res: Response) {
    try {
      const { id } = res.locals.user
      const user = await authService.me(id)

      if (!user) {
        res.status(404).json({ error: 'Usuário não encontrado' })
        return
      }

      res.json(user)
    } catch (error) {
      res.status(500).json({ error: 'Erro interno do servidor' })
    }
  };

  // PATCH /auth/me — edita username e/ou email do usuário logado.
  async updateProfile(req: Request, res: Response) {
    try {
      const parsed = updateProfileSchema.safeParse(req.body)
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message })
        return
      }

      const { id } = res.locals.user
      const user = await authService.updateProfile(id, parsed.data)

      res.json(user)
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Erro ao atualizar perfil'
      })
    }
  };

  // PATCH /auth/me/password — troca a senha (exige a senha atual).
  async changePassword(req: Request, res: Response) {
    try {
      const parsed = changePasswordSchema.safeParse(req.body)
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message })
        return
      }

      const { id } = res.locals.user
      await authService.changePassword(id, parsed.data.currentPassword, parsed.data.newPassword)

      res.json({ success: true })
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Erro ao trocar a senha'
      })
    }
  };

  // DELETE /auth/me — exclui a conta (exige a senha) e limpa o cookie.
  async deleteAccount(req: Request, res: Response) {
    try {
      const parsed = deleteAccountSchema.safeParse(req.body)
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message })
        return
      }

      const { id } = res.locals.user
      await authService.deleteAccount(id, parsed.data.password)

      res.clearCookie('token')
      res.json({ success: true })
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Erro ao excluir a conta'
      })
    }
  };

}
