import { NextFunction, Request, Response } from 'express'

// Deve rodar SEMPRE depois do authMiddleware, que preenche res.locals.user
export function adminMiddleware(_req: Request, res: Response, next: NextFunction) {
  const user = res.locals.user

  if (!user?.isAdmin) {
    res.status(403).json({ error: 'Acesso restrito a administradores' })
    return
  }

  next()
}
