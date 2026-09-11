import fs from 'fs'
import path from 'path'

// A lista é o Pwdb_top-10000.txt do SecLists (licença MIT), que por sua vez sai
// do Pwdb-Public: ranking de frequência extraído de 1 bilhão de credenciais
// vazadas. https://github.com/danielmiessler/SecLists
// Vale saber que o comprimento médio das senhas daquele corpus é 9,48
// caracteres: uma lista das senhas mais comuns do mundo real é uma lista de
// senhas curtas, então comparar por match exato contra uma política de 15
// caracteres nunca ia alcançar quase nada. É isso que a canonizar() resolve.
//
// Carrega a blocklist UMA VEZ, quando o módulo é importado (na subida do
// servidor), em vez de ler o arquivo a cada validação. As senhas ficam em
// um Set para lookup O(1), checar se uma senha está na lista é instantâneo,
// independente do tamanho da lista.
const blocklistPath = path.join(__dirname, '..', 'data', 'common-passwords.txt')

const linhas = fs.readFileSync(blocklistPath, 'utf-8')
  .split('\n')
  .map(linha => linha.trim().toLowerCase())
  .filter(linha => linha.length > 0)

// Raízes muito curtas viram coringas: a entrada "abc123" canoniza para "abc" e
// passaria a barrar qualquer senha cuja raiz também seja "abc". Quatro letras é
// o piso onde a raiz ainda descreve uma palavra, não um prefixo qualquer.
const TAMANHO_MINIMO_RAIZ = 4

/**
 * Reduz a senha à sua "raiz": a palavra que sobra depois de tirar as mutações
 * previsíveis que as pessoas usam para satisfazer regras de composição.
 *
 * Existe porque a política de comprimento (mínimo de 15) tornava a blocklist
 * quase inerte: só 18 das 10.000 entradas têm 15+ caracteres, então o Zod
 * rejeitava antes e a lista nunca era consultada de verdade. Quem digita
 * `senha123456789012` passa dos 15 caracteres sem ganhar nenhuma entropia
 * real, a senha continua sendo `senha`. Comparar raiz com raiz devolve a
 * maior parte da lista ao jogo (cerca de 6.500 das 10.000 entradas).
 *
 * A ordem das etapas importa: as pontas são limpas ANTES do leet, senão
 * `password1234` viraria `passwordi2ea` (o 1 e o 3 do sufixo virariam letras)
 * e o sufixo deixaria de ser removível.
 */
function canonizar(texto: string): string {
  return texto
    .toLowerCase()
    // 1. Tira dígitos, símbolos e espaços das pontas: os sufixos e prefixos
    //    decorativos ("senha2024", "!!!admin") não mudam o miolo da senha.
    .replace(/^[^a-z]+|[^a-z]+$/g, '')
    // 2. Desfaz o leet mais comum, agora que só sobrou o miolo: p4ssw0rd para password.
    .replace(/[4@]/g, 'a')
    .replace(/3/g, 'e')
    .replace(/[1!|]/g, 'i')
    .replace(/0/g, 'o')
    .replace(/[5$]/g, 's')
    .replace(/7/g, 't')
    // 3. Colapsa repetições de 3 ou mais: "passworddddd" -> "password".
    .replace(/(.)\1{2,}/g, '$1')
}

// Frases que este projeto já publicou como exemplo de senha boa. A interface
// não imprime mais exemplar nenhum: ela descreve o formato ("uma frase com
// quatro ou cinco palavras"), porque a orientação é que vale e a string é que
// custa. Mas estas duas continuam impressas na documentação do repositório, e a
// primeira é a frase canônica do XKCD, conhecida no mundo inteiro.
// A regra é geral: toda senha que a aplicação ou a documentação mostra deixa de
// ser uma senha possível no instante em que é publicada. Entram pelo mesmo
// caminho das outras entradas, então as variações decoradas caem na checagem
// por raiz de graça.
const FRASES_PUBLICADAS = [
  'correta cavalo bateria grampo',
  'cavalo bateria grampo azul',
]

const entradas = [...linhas, ...FRASES_PUBLICADAS]

// Duas estruturas, dois papéis. A primeira guarda as senhas como estão no
// arquivo (match exato, o comportamento original). A segunda guarda as raízes,
// e é ela que pega as variações: comparar raiz da senha com raiz da entrada
// evita ter que gerar todas as mutações possíveis de cada palavra em memória.
const senhasComuns = new Set(entradas)

const raizesComuns = new Set(
  entradas
    .map(canonizar)
    .filter(raiz => raiz.length >= TAMANHO_MINIMO_RAIZ)
)

// Termos do próprio serviço. O NIST SP 800-63B-4 manda incluir na blocklist
// "context-specific words", citando o nome do serviço ao lado do username:
// "imageboard2026" é a primeira coisa que entra numa wordlist mirada NESTE site,
// e ela passa em qualquer regra de comprimento.
const TERMOS_DO_SERVICO = ['imageboard', 'chan']

// Abaixo disso o termo derivado é ruído e não contexto (o "br" de um email).
const TAMANHO_MINIMO_TERMO = 3

// A partir deste tamanho o termo casa em qualquer posição da senha. Abaixo dele
// exige fronteira de não-letra: "chan" sozinho ou em "4chan" é contexto do site,
// "chan" dentro de "chance" ou "manchando" é coincidência de sílaba. Barrar
// passphrase legítima é o jeito mais rápido de empurrar o usuário de volta para
// a senha curta que a política inteira está tentando evitar.
const TAMANHO_SUBSTRING_LIVRE = 6

const escaparRegex = (termo: string) => termo.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&')

function casa(texto: string, termo: string): boolean {
  if (termo.length >= TAMANHO_SUBSTRING_LIVRE) {
    return texto.includes(termo)
  }
  return new RegExp(`(^|[^a-z])${escaparRegex(termo)}([^a-z]|$)`).test(texto)
}

/**
 * Termos de contexto que saem do email: o local-part inteiro e os pedaços
 * separados por . - _ + ("joao.silva+news@dominio" -> joao.silva, joao, silva,
 * news). O domínio fica de fora de propósito: "gmail" é compartilhado por meio
 * mundo, não é segredo de ninguém.
 */
function termosDoEmail(email: string): string[] {
  const localPart = email.toLowerCase().split('@')[0] ?? ''
  return [localPart, ...localPart.split(/[.\-_+]/)]
}

/**
 * Verifica se a senha viola a política contextual/blocklist.
 * Retorna uma mensagem de erro se inválida, ou null se aceitável.
 *
 * @param password - a senha em texto puro a validar
 * @param username - o username do usuário (para bloqueio contextual)
 * @param email - o email do usuário; o local-part também é contexto dele
 */
export function validarSenhaContextual(
  password: string,
  username: string,
  email = ''
): string | null {
  const senhaLower = password.toLowerCase()

  // 1. Blocklist de senhas comuns/vazadas (NIST SHALL), em duas passadas:
  //    a senha literal e a raiz dela. A mensagem diz o motivo da recusa de
  //    propósito: o NIST SP 800-63B-4 pede que o verificador oriente o usuário
  //    quando rejeita uma senha. Não há risco de enumeração aqui, a checagem
  //    olha só o que foi digitado, sem tocar no banco.
  const raiz = canonizar(senhaLower)

  if (senhasComuns.has(senhaLower) || raizesComuns.has(raiz)) {
    return 'Esta senha é comum demais. Escolha uma senha mais difícil de adivinhar.'
  }

  // 2. Bloqueio contextual: username, email e nome do serviço. A comparação
  //    roda duas vezes, contra a senha literal e contra a raiz canonizada,
  //    porque quem escreve "J0aoSilva2026" está usando o próprio username com
  //    as mesmas mutações previsíveis que a canonização já desfaz.
  const contemContexto = (termo: string): boolean => {
    const alvo = termo.trim().toLowerCase()
    if (alvo.length < TAMANHO_MINIMO_TERMO) return false

    const raizTermo = canonizar(alvo)

    return (
      casa(senhaLower, alvo) ||
      (raizTermo.length >= TAMANHO_MINIMO_TERMO && casa(raiz, raizTermo))
    )
  }

  if (username && contemContexto(username)) {
    return 'A senha não pode conter o seu nome de usuário.'
  }

  if (email && termosDoEmail(email).some(contemContexto)) {
    return 'A senha não pode conter partes do seu email.'
  }

  if (TERMOS_DO_SERVICO.some(contemContexto)) {
    return 'A senha não pode conter o nome do site.'
  }

  return null
}

// Exportada só para o script de validação em docs/writeups/pocs: medir a taxa
// de falso positivo exige enxergar a raiz, não apenas o veredito final.
export { canonizar }
