import app from './app'
import { GeminiService } from './services/gemini.service'

const PORT = process.env.PORT ?? 3001

// Agendador da IA: a cada 5 minutos, 1 bot posta em 1 thread aleatória.
// O próprio método checa a chave geral isAIActive, então o admin desliga por lá.
const CINCO_MINUTOS = 5 * 60 * 1000
const geminiService = new GeminiService()

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`)

  setInterval(() => {
    geminiService
      .postarAutomatico()
      .catch(err => console.error('Erro no agendador da IA:', err))
  }, CINCO_MINUTOS)
})
