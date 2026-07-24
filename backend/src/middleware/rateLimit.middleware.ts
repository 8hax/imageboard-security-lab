import rateLimit from 'express-rate-limit'

// Limite ESTRITO para autenticação (login/register).
// Objetivo: impedir brute force de senha e criação abusiva de contas.
// 5 tentativas por IP a cada 15 minutos.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutos
  max: 5,                     // 5 requisições por janela, por IP
  standardHeaders: true,      // expõe os headers RateLimit-* (informa o cliente)
  legacyHeaders: false,       // desativa os headers X-RateLimit-* antigos
  message: { error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
})

// Limite MODERADO para criação de posts.
// Objetivo: impedir flood/spam que sobrecarrega o servidor, polui o board
// e consome a cota da API do Gemini (cada post humano dispara os bots).
// 10 posts por IP a cada 1 minuto.
export const postLimiter = rateLimit({
  windowMs: 60 * 1000,        // 1 minuto
  max: 10,                    // 10 posts por janela, por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Você está postando rápido demais. Aguarde um momento.' },
})