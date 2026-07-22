import { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { AuthPayload } from '../tipos/auth-payload'

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies.token

  if (!token) {
    res.status(401).json({ error: 'Token não encontrado' })
    return
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload

    res.locals.user = payload

    next()
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' })
  }
}