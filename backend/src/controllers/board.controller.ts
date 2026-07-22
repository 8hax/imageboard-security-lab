import { Request, Response } from 'express'
import { BoardService } from '../services/board.services'

const boardService = new BoardService()

export class BoardController {
  async findBySlug(req: Request, res: Response) {
    try {
      const { slug } = req.params as { slug: string }
      const board = await boardService.findBySlug(slug)

      if (!board) {
        res.status(404).json({ error: 'Board não encontrado' })
        return
      }

      res.json(board)
    } catch (error) {
      res.status(500).json({ error: 'Erro interno do servidor' })
    }
  }
}