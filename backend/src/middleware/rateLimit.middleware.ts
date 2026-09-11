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

// Limite ESTRITO para as ações que exigem confirmar a senha ATUAL
// (trocar senha e excluir conta).
// Objetivo: esses endpoints rodam bcrypt.compare contra a senha do usuário, ou
// seja, respondem "essa senha está certa?". São um oráculo de senha para quem
// já tem a sessão (cookie roubado via XSS, máquina compartilhada, sessão
// esquecida aberta). Sem limite, dá para forçar a senha atual à vontade por
// trás do authMiddleware. Trocar senha e excluir conta são ações raras, então
// 5 tentativas por hora não incomodam o uso legítimo.
export const passwordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hora
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas. Tente novamente mais tarde.' },
})

// Limite ESTRITO para edição de perfil.
// Editar dados (username/email) é uma ação rara e deliberada, então uma
// janela longa com poucas tentativas dificulta a varredura de emails
// (enumeration) via endpoint de atualização, sem incomodar o uso legítimo.
export const profileLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hora
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas alterações de perfil. Tente novamente mais tarde.' },
})