/**
 * PoC 04 Blocklist de senhas: alcance real e taxa de falso positivo.
 *
 * Mede:
 *   1. Quantas entradas da blocklist eram alcançáveis ANTES da normalização
 *      (match exato + mínimo de 15 caracteres) e quantas passaram a ser.
 *   2. Senhas fracas com 15+ caracteres que passavam na política e agora são
 *      barradas (verdadeiro positivo).
 *   3. Quantas senhas legitimamente fortes a normalização derruba por engano
 *      (falso positivo), o custo da mitigação.
 *   4. O bloqueio contextual (username, email e nome do site), com casos que
 *      devem e que não devem ser barrados.
 *   5. O custo de carregar a lista e o custo de cada validação.
 *   6. (opcional) A taxa de falso positivo numa varredura de 2.000.000 de
 *      senhas de gerenciador, grande o bastante para enxergar eventos raros.
 *
 * Uso, a partir de backend/:
 *   npx tsx ../docs/writeups/pocs/04-blocklist-normalizacao.ts
 *   npx tsx ../docs/writeups/pocs/04-blocklist-normalizacao.ts --varredura
 */

import fs from 'fs'
import path from 'path'
import { validarSenhaContextual, canonizar } from '../../../backend/src/utils/passwordBlocklist'

const MINIMO_POLITICA = 15

const blocklist = fs
  .readFileSync(path.join(__dirname, '../../../backend/src/data/common-passwords.txt'), 'utf-8')
  .split('\n')
  .map(l => l.trim().toLowerCase())
  .filter(l => l.length > 0)

const bloqueada = (senha: string) => validarSenhaContextual(senha, 'usuario_teste') !== null

// 1. alcance

// Antes: a comparação era literal, então uma entrada só podia ser digitada por
// alguém se ela mesma passasse no mínimo de 15 caracteres.
const alcancavelAntes = blocklist.filter(s => s.length >= MINIMO_POLITICA).length

// Depois: qualquer entrada cuja raiz sobreviva à canonização pode ser alcançada
// por alguma senha de 15+ caracteres (a entrada + sufixo decorativo).
const alcancavelDepois = new Set(
  blocklist.map(canonizar).filter(r => r.length >= 4)
).size + alcancavelAntes

console.log('1. Alcance da blocklist (10.000 entradas)')
console.log(`Antes (match exato):        ${alcancavelAntes} entradas alcançáveis`)
console.log(`Depois (raiz normalizada):  ~${alcancavelDepois} entradas alcançáveis`)
console.log()

// 2. verdadeiros positivos

// Senhas construídas do jeito que as pessoas realmente esticam uma senha fraca
// para bater um mínimo de comprimento. Todas têm 15+ caracteres, ou seja: todas
// passavam na política antes desta correção.
const senhasFracasLongas = [
  'senha123456789012',
  'password12345678',
  'p4ssw0rd12345678',
  'iloveyou!!!!!!!!',
  'monkey1234567890',
  'qwerty1234567890',
  '2024corinthians!',
  'flamengo00000000',
  'PRINCESS12345678',
  'sunshine!!!!!!!!',
  'futebol1234567890',
  'a$tr0naut12345678',
]

console.log('2. Senhas fracas com 15+ chars (passavam antes)')
let pegas = 0
for (const senha of senhasFracasLongas) {
  const bloq = bloqueada(senha)
  if (bloq) pegas++
  console.log(
    `${bloq ? 'BLOQUEADA' : 'passa    '}  ${senha.padEnd(20)} raiz: ${canonizar(senha) || '(vazia)'}`
  )
}
console.log(`\nCobertura: ${pegas}/${senhasFracasLongas.length}`)
console.log()

// 2b. as frases que o projeto já publicou como exemplo

// A interface descreve o formato da passphrase em vez de imprimir um exemplar,
// mas estas frases seguem impressas na documentação, e a do XKCD é conhecida no
// mundo inteiro. Toda senha que a aplicação ou a documentação mostra deixa de
// ser possível, inclusive decorada com sufixo.
const frasesPublicadas = [
  'correta cavalo bateria grampo',
  'cavalo bateria grampo azul',
  'Cavalo Bateria Grampo Azul2026',
  'cavalo bateria grampo azul!!!!',
]

console.log('2b. Frases publicadas como exemplo (devem ser BLOQUEADAS)')
for (const frase of frasesPublicadas) {
  const bloq = bloqueada(frase)
  console.log(`${bloq ? 'BLOQUEADA' : 'FALHA    '}  ${frase}`)
}
console.log()

// 3. falsos positivos

// Corpus A: passphrases do estilo que a política nova quer incentivar.
// A frase canônica do XKCD saiu daqui de propósito: ela está impressa
// na documentação, então virou entrada da blocklist (ver bloco 2b) e barrá-la é
// o comportamento correto, não um falso positivo.
const passphrases = [
  'lampada acesa no corredor azul',
  'meu gato dorme na janela azul',
  'cafe frio segunda de manha',
  'tres livros em cima da mesa',
  'a chuva molhou toda a varanda',
  'bicicleta vermelha sem freio',
  'onze pinguins atravessam a rua',
  'violao velho no porta malas',
  'nuvem baixa sobre o telhado',
  'quinze passos ate a padaria',
  'o forno queimou o pao de novo',
  'mochila cheia de pedras leves',
]

// PRNG com semente fixa, e não Math.random(). Os corpora aleatórios precisam
// ser os MESMOS a cada execução: com Math.random() a taxa de falso positivo
// mudava de rodada para rodada (0 numa, 1 em 20.000 na seguinte), e um writeup
// que cita "zero falsos positivos" precisa citar um número que o leitor
// reproduz. Corpus aleatório sem semente é medição que não se confere.
function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const SEMENTE = 20260906
const rand = mulberry32(SEMENTE)

// Atenção ao ler o resultado do bloco 3: com esta semente os três corpora dão
// zero falso positivo, mas isso é um teste de REGRESSÃO (se um dia der diferente
// de zero, alguma regra passou a barrar demais), e NÃO uma estimativa da taxa.
// A taxa é medida à parte, no bloco 6 (--varredura), com 2.000.000 de senhas
// de gerenciador: 3 bloqueadas, ou 1 em ~670.000, todas pelo mesmo motivo, o
// termo curto "chan" casando por acaso entre não-letras (às vezes depois de a
// canonização desfazer o leet, como em "...2ch4n0"). 40.000 amostras são poucas
// para enxergar um evento dessa raridade: não confunda "zero nesta rodada"
// com "não acontece".

// Corpus B: senhas de gerenciador de senhas (aleatórias, 16-24 chars).
const alfabeto = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*-_=+'
const aleatorias: string[] = []
for (let i = 0; i < 20000; i++) {
  const tamanho = 16 + (i % 9)
  let s = ''
  for (let j = 0; j < tamanho; j++) {
    s += alfabeto[Math.floor(rand() * alfabeto.length)]
  }
  aleatorias.push(s)
}

// Corpus C: passphrases sintéticas, combinações de palavras comuns do
// português que NÃO são senhas de lista, só palavras do dia a dia.
const palavras = [
  'janela', 'caderno', 'telhado', 'girassol', 'bondinho', 'peixe', 'relogio',
  'estrada', 'faisca', 'martelo', 'lanterna', 'orvalho', 'ferrugem', 'agulha',
  'bilhete', 'colheita', 'degrau', 'esquina', 'fivela', 'goiaba',
]
const sinteticas: string[] = []
for (let i = 0; i < 20000; i++) {
  const p = () => palavras[Math.floor(rand() * palavras.length)]
  sinteticas.push(`${p()}-${p()}-${p()}`)
}

console.log('3. Falsos positivos (senhas fortes barradas por engano)')
for (const [nome, corpus] of [
  ['Passphrases escritas à mão', passphrases],
  ['Aleatórias de gerenciador  ', aleatorias],
  ['Passphrases sintéticas     ', sinteticas],
] as [string, string[]][]) {
  const falhas = corpus.filter(s => s.length >= MINIMO_POLITICA && bloqueada(s))
  const taxa = ((falhas.length / corpus.length) * 100).toFixed(3)
  console.log(`${nome}  ${String(corpus.length).padStart(6)} amostras -> ${falhas.length} bloqueadas (${taxa}%)`)
  for (const f of falhas.slice(0, 5)) {
    console.log(`    exemplo: ${f}  (raiz: ${canonizar(f)})`)
  }
}
console.log()

// 4. bloqueio contextual (username + email + nome do serviço)

// Antes desta rodada o contexto era só o username, comparado como substring
// literal. Cada caso abaixo diz o que a checagem passou a enxergar.
const USUARIO = 'joaosilva'
const EMAIL = 'joao.silva+news@provedor.com'

const casosContexto: [string, string, boolean][] = [
  ['joaosilva minha senha', 'username literal (já pegava antes)', true],
  ['J0a0Silva do bairro!!', 'username com leet, só a raiz pega', true],
  ['joao.silva senha boa', 'local-part inteiro do email', true],
  ['a senha do silva aqui', 'pedaço do local-part', true],
  ['news da manha bem cedo', 'tag +news do email', true],
  ['imageboard do trabalho', 'nome do serviço', true],
  ['senha do chan de novo', 'apelido do serviço, palavra solta', true],
  ['minha senha no 4chan!!', 'apelido colado em não-letra', true],
  ['uma chance boa de novo', '"chance" NÃO é o site', false],
  ['manchando o caderno la', '"manchando" NÃO é o site', false],
  ['silvana mora na esquina', '"silvana" NÃO é o local-part', false],
]

console.log('4. Bloqueio contextual: username, email e nome do site')
console.log(`   usuario: ${USUARIO}   email: ${EMAIL}`)
let acertosContexto = 0
for (const [senha, motivo, esperado] of casosContexto) {
  const erro = validarSenhaContextual(senha, USUARIO, EMAIL)
  const bloq = erro !== null
  const ok = bloq === esperado
  if (ok) acertosContexto++
  console.log(
    `${ok ? ' ok ' : 'FALHA'}  ${(bloq ? 'BLOQUEADA' : 'passa    ')}  ${senha.padEnd(24)} ${motivo}`
  )
}
console.log(`\nCasos corretos: ${acertosContexto}/${casosContexto.length}`)

// O custo do contexto novo nos mesmos corpora de falso positivo, agora com um
// usuário real por trás (antes o teste rodava com 'usuario_teste').
const comContexto = (s: string) => validarSenhaContextual(s, USUARIO, EMAIL) !== null
for (const [nome, corpus] of [
  ['Aleatórias de gerenciador', aleatorias],
  ['Passphrases sintéticas   ', sinteticas],
] as [string, string[]][]) {
  const falhas = corpus.filter(s => s.length >= MINIMO_POLITICA && comContexto(s))
  const taxa = ((falhas.length / corpus.length) * 100).toFixed(3)
  console.log(`${nome}  ${String(corpus.length).padStart(6)} amostras -> ${falhas.length} bloqueadas (${taxa}%)`)
  for (const f of falhas.slice(0, 5)) {
    console.log(`    exemplo: ${f}`)
  }
}
console.log()

// 5. custo de execução

// Repete o que o passwordBlocklist.ts faz uma vez na subida do servidor (ler o
// arquivo, montar o Set literal e o Set de raízes) para medir quanto isso custa.
// Os tempos variam com a máquina: o que importa é a ordem de grandeza. Aqui o
// processo já está aquecido (o arquivo está em cache e a canonizar() já rodou
// no bloco 1), então a carga medida é o piso; a carga fria, na subida real do
// servidor, pode levar algumas vezes mais.
console.log('5. Custo de execução')
const inicioCarga = performance.now()
const linhasCarga = fs
  .readFileSync(path.join(__dirname, '../../../backend/src/data/common-passwords.txt'), 'utf-8')
  .split('\n')
  .map(l => l.trim().toLowerCase())
  .filter(l => l.length > 0)
const literais = new Set(linhasCarga)
const raizes = new Set(linhasCarga.map(canonizar).filter(r => r.length >= 4))
const msCarga = performance.now() - inicioCarga

// Cada validação percorre as duas passadas da blocklist e o contexto inteiro
// (username, email e nome do site), que é o caminho que o cadastro executa.
const repeticoes = 5
const inicioValidacao = performance.now()
for (let r = 0; r < repeticoes; r++) {
  for (const s of aleatorias) comContexto(s)
}
const usPorValidacao = ((performance.now() - inicioValidacao) * 1000) / (repeticoes * aleatorias.length)

console.log(`Carga e canonização da lista: ${msCarga.toFixed(0)} ms (${literais.size} literais, ${raizes.size} raízes)`)
console.log(`Custo por validação:          ${usPorValidacao.toFixed(2)} µs`)

// 6. varredura longa (opcional)

// O bloco 3 usa 40.000 amostras, poucas para enxergar um evento raro. Esta
// varredura gera 2.000.000 de senhas de gerenciador, do mesmo jeito que o
// corpus B, com uma semente própria e também fixa. Fica atrás de uma flag
// porque leva alguns segundos.
const SEMENTE_VARREDURA = 20260910

if (process.argv.includes('--varredura')) {
  console.log()
  console.log('6. Varredura longa de falso positivo')
  const TOTAL = 2_000_000
  const randVarredura = mulberry32(SEMENTE_VARREDURA)
  const barradas: string[] = []

  for (let i = 0; i < TOTAL; i++) {
    const tamanho = 16 + (i % 9)
    let s = ''
    for (let j = 0; j < tamanho; j++) {
      s += alfabeto[Math.floor(randVarredura() * alfabeto.length)]
    }
    if (bloqueada(s)) barradas.push(s)
  }

  const taxa = ((barradas.length / TOTAL) * 100).toFixed(5)
  const umEm = barradas.length > 0 ? Math.round(TOTAL / barradas.length).toLocaleString('pt-BR') : '—'
  console.log(`Aleatórias de gerenciador: ${TOTAL.toLocaleString('pt-BR')} amostras -> ${barradas.length} bloqueadas`)
  console.log(`Taxa: ${taxa}%  (1 em ~${umEm})`)
  for (const s of barradas) {
    console.log(`    ${s.padEnd(26)} ${validarSenhaContextual(s, 'usuario_teste')}`)
  }
}
