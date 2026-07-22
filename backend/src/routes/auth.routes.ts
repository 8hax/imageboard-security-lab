import { Router } from 'express'
import { AuthController } from '../controllers/auth.controller'
import { authMiddleware } from '../middleware/auth.middleware'

const authController = new AuthController()
const router = Router()

router.post('/register', (req, res) => authController.create(req, res))
router.post('/login', (req, res) => authController.login(req, res))
router.post('/logout', (req, res) => authController.logout(req, res))
router.get('/me', authMiddleware, (req, res) => authController.me(req, res))

// CRUD do próprio usuário (logado)
router.patch('/me', authMiddleware, (req, res) => authController.updateProfile(req, res))
router.patch('/me/password', authMiddleware, (req, res) => authController.changePassword(req, res))
router.delete('/me', authMiddleware, (req, res) => authController.deleteAccount(req, res))

export { router as authRoutes }