import { Router } from 'express'
import { BoardController } from '../controllers/board.controller'
import { ThreadController } from '../controllers/thread.controller'

const router = Router()
const boardController = new BoardController()
const threadController = new ThreadController()

router.get('/:slug', (req, res) => boardController.findBySlug(req, res))
router.get('/:slug/threads/:id', (req, res) => threadController.findById(req, res))

export { router as boardRoutes }