import { GoogleGenAI } from '@google/genai'
import prisma from '../lib/prisma'

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

export class GeminiService {

  // Gera uma resposta para um bot baseado no contexto da thread
  async gerarResposta(threadId: string, botId: string): Promise<string> {

    // Busca os últimos 10 posts da thread para contexto
    const posts = await prisma.post.findMany({
      where: { threadId },
      orderBy: { createdAt: 'asc' },
      take: 10,
      include: {
        author: {
          select: { username: true, isAI: true }
        }
      }
    })

    const thread = await prisma.thread.findUnique({
      where: { id: threadId }
    })

    const bot = await prisma.user.findUnique({
      where: { id: botId },
      select: { username: true }
    })

    // Monta o contexto da conversa para o Gemini
    const contexto = posts
      .map(p => `${p.author.username}: ${p.content}`)
      .join('\n')

    const prompt = `
Você é ${bot?.username}, um usuário de um imageboard de tecnologia chamado /tech/.
O tema da thread é: "${thread?.title}"
Descrição: "${thread?.description}"

Conversa atual:
${contexto}

Responda como ${bot?.username} de forma natural, opinativa e direta, no estilo de um fórum anônimo de tecnologia.
Máximo 3 frases. Não use emojis. Não se apresente.
`

    const response = await genai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    })

    return response.text ?? 'Sem resposta'
  }

  // BOTÃO DO ADMIN: uma rodada — cada bot posta uma vez na thread aberta.
  // Limite fixo (nº de bots) para não estourar os tokens por minuto.
  // Ignora a chave geral isAIActive de propósito: é uma ação manual do admin!!
  // Retorna quantos posts foram criados e quantos bots existiam, para o
  // controller distinguir "sem bots" de "todos falharam".
  async gerarPostsNaThread(threadId: string): Promise<{ criados: number; totalBots: number }> {
    const bots = await prisma.user.findMany({
      where: { isAI: true }
    })

    let criados = 0

    for (const [i, bot] of bots.entries()) {
      // Espaça as chamadas p/ não estourar o limite de requisições por minuto
      // do free tier (não espera antes da primeira nem depois da última).
      if (i > 0) await this.delay(1200)

      try {
        const conteudo = await this.gerarResposta(threadId, bot.id)

        await prisma.post.create({
          data: {
            content: conteudo,
            threadId,
            authorId: bot.id,
          }
        })
        criados++
      } catch (error) {
        console.error(`Erro ao gerar resposta do bot ${bot.username}:`, error)
      }
    }

    return { criados, totalBots: bots.length }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // AGENDADOR (5 em 5 min): 1 bot aleatório posta em 1 thread aleatória.
  // Respeita a chave geral isAIActive — o admin pode desligar por aqui.
  async postarAutomatico(): Promise<void> {
    const settings = await prisma.systemSettings.findUnique({
      where: { id: 'global_settings' }
    })

    if (!settings?.isAIActive) return

    const bots = await prisma.user.findMany({ where: { isAI: true } })
    const threads = await prisma.thread.findMany({ select: { id: true } })

    const bot = bots[Math.floor(Math.random() * bots.length)]
    const thread = threads[Math.floor(Math.random() * threads.length)]

    // Sem bots ou sem threads: nada a fazer
    if (!bot || !thread) return

    try {
      const conteudo = await this.gerarResposta(thread.id, bot.id)

      await prisma.post.create({
        data: {
          content: conteudo,
          threadId: thread.id,
          authorId: bot.id,
        }
      })
      console.log(`[IA] ${bot.username} postou automaticamente na thread ${thread.id}`)
    } catch (error) {
      console.error(`Erro no post automático do bot ${bot.username}:`, error)
    }
  }

}