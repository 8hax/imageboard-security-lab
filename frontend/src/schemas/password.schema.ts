import { z } from "zod";

// Espelha o passwordRules do backend (auth.controller): política NIST SP
// 800-63B-4, comprimento em vez de composição obrigatória. Fica em um arquivo
// só porque cadastro e troca de senha usam a MESMA regra, duplicar já fez as
// duas telas divergirem do backend uma vez.
// A blocklist de senhas comuns e o bloqueio contextual (username, email e
// nome do site) rodam só no backend: a validação aqui é feedback antecipado,
// não a fronteira de segurança.
// O bcrypt (no backend) descarta tudo além de 72 BYTES sem avisar, e caractere
// não é byte: um "ç" ocupa 2, um emoji até 4. O teto precisa ser medido em
// bytes, senão 64 caracteres acentuados passam na regra e têm o final cortado.
const LIMITE_BYTES_BCRYPT = 72;

const cabeNoBcrypt = (senha: string) =>
    new TextEncoder().encode(senha).length <= LIMITE_BYTES_BCRYPT;

// O texto da política que a UI mostra ANTES do erro. NÃO é o "hint" que o NIST
// SP 800-63B-4 proíbe: aquele é o lembrete que o próprio usuário guarda sobre a
// SENHA DELE e que fica visível para quem não se autenticou. Este aqui é a
// orientação que a mesma seção 3.1.1.2 exige ("Verifiers SHALL offer guidance
// to the subscriber to help the subscriber choose a strong password").
// Fica junto da regra pelo mesmo motivo que a regra é um arquivo só: um aviso
// que diverge da validação é pior que aviso nenhum. Foi o que aconteceu com o
// "mínimo 5 caracteres, com 1 maiúscula" que sobreviveu no perfil depois da
// política nova.
// A orientação descreve o FORMATO e não imprime um exemplar. A permissão
// explícita ("não exigimos maiúscula, número ou símbolo") é o que faz o trabalho
// de segurança: sem ela o usuário lê "mínimo 15" e produz "Senha@123456789",
// esticando a mutação previsível que a política inteira quer eliminar — que é o
// motivo declarado pelo NIST para exigir orientação ("...as it discourages
// trivial modifications of listed weak passwords").
// Já um EXEMPLO concreto de senha é lido pelo atacante junto com o usuário, e
// sempre tem quem digite exatamente o que viu: vira candidato de dicionário
// distribuído pela própria aplicação. As duas coisas são separáveis, e o valor
// está na permissão, não na string. Por isso: descreva a frase, não a escreva.
export const TEXTO_POLITICA_SENHA =
    "Mínimo de 15 caracteres. Não exigimos maiúscula, número ou símbolo: uma frase com quatro ou cinco palavras é mais forte e mais fácil de lembrar do que uma senha curta e complicada.";

export const passwordRules = z.string()
    .min(15, "A senha deve ter no mínimo 15 caracteres")
    .max(64, "A senha deve ter no máximo 64 caracteres")
    .refine(cabeNoBcrypt, "A senha é longa demais. Acentos e emojis ocupam espaço extra. Use menos caracteres.");
