import { Router } from 'express'
import { PostsController } from '../controllers/posts.controller'
import { authMiddleware } from '../middleware/auth.middleware'
import { postLimiter } from '../middleware/rateLimit.middleware'

const router = Router()
const postsController = new PostsController()

// todas as rotas de posts requerem login!!!
router.use(authMiddleware)

router.post('/', postLimiter, (req, res) => postsController.create(req, res))
router.delete('/:id', (req, res) => postsController.delete(req, res))
router.get('/user', (req, res) => postsController.findPostsByUser(req, res))

export { router as postsRoutes }