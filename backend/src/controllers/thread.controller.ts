import { Request, Response } from 'express'
import { ThreadService } from '../services/thread.service'

const threadService = new ThreadService()

export class ThreadController {
  async findById(req: Request, res: Response) {
    try {
      const { id } = req.params as {id: string};
      const thread = await threadService.findById(id)

      if (!thread) {
        res.status(404).json({ error: 'Thread não encontrada' })
        return
      }

      res.json(thread)
    } catch (error) {
      res.status(500).json({ error: 'Erro interno do servidor' })
    }
  }
}