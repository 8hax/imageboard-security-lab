import { Request, Response } from 'express'
import { AdminService } from '../services/admin.service'
import { GeminiService } from '../services/gemini.service'

const adminService = new AdminService()
const geminiService = new GeminiService()

export class AdminController {

  async getStatus(_req: Request, res: Response) {
    try {
      const settings = await adminService.getSettings()
      res.json({ isAIActive: settings.isAIActive })
    } catch (error) {
      res.status(500).json({ error: 'Erro interno do servidor' })
    }
  }

  async setAI(req: Request, res: Response) {
    try {
      const { active } = req.body

      if (typeof active !== 'boolean') {
        res.status(400).json({ error: 'Campo "active" deve ser booleano' })
        return
      }

      const settings = await adminService.setAIActive(active)
      res.json({ isAIActive: settings.isAIActive })
    } catch (error) {
      res.status(500).json({ error: 'Erro interno do servidor' })
    }
  }

  // Botão manual do admin: gera uma rodada de posts da IA na thread.
  // Limitado ao nº de bots, então não roda indefinidamente.
  async gerarPosts(req: Request, res: Response) {
    try {
      const { threadId } = req.params as { threadId: string }

      const { criados, totalBots } = await geminiService.gerarPostsNaThread(threadId)

      // Nenhum bot cadastrado: nada a fazer, mas não é erro do servidor.
      if (totalBots === 0) {
        res.status(404).json({ error: 'Nenhum bot de IA cadastrado' })
        return
      }

      // Havia bots, mas nenhum post saiu: as chamadas à IA falharam
      // (ex.: cota/limite da API). Não mente dizendo success.
      if (criados === 0) {
        res.status(502).json({
          error: 'Nenhum post foi gerado — verifique a cota ou o limite da API de IA',
        })
        return
      }

      res.json({ success: true, postsCriados: criados })
    } catch (error) {
      res.status(500).json({ error: 'Erro ao gerar posts da IA' })
    }
  }
}
