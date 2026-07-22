import { Router } from 'express'
import { AdminController } from '../controllers/admin.controller'
import { authMiddleware } from '../middleware/auth.middleware'
import { adminMiddleware } from '../middleware/admin.middleware'

const router = Router()
const adminController = new AdminController()

// todas as rotas exigem login + privilégio de admin
router.use(authMiddleware, adminMiddleware)

router.get('/ai', (req, res) => adminController.getStatus(req, res))
router.patch('/ai', (req, res) => adminController.setAI(req, res))

// botão manual: dispara uma rodada de posts da IA na thread
router.post('/threads/:threadId/gerar', (req, res) => adminController.gerarPosts(req, res))

export { router as adminRoutes }
