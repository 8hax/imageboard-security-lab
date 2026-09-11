/**
 * PoC 04 bcrypt: truncamento em 72 bytes, custo do oráculo de senha e o
 * limitador compartilhado.
 *
 * Mede:
 *   1. Duas senhas de 64 caracteres, ambas válidas pela política antiga (max(64)
 *      em caracteres), que o bcrypt trata como a mesma senha.
 *   2. Quanto custa cada bcrypt.compare (custo 10) e quantos chutes cabem em
 *      5 minutos num endpoint sem rate limit.
 *   3. Que o passwordLimiter soma as tentativas de PATCH /me/password e
 *      DELETE /me, em vez de dar um orçamento separado para cada rota.
 *
 * Uso, a partir de backend/:
 *   npx tsx ../docs/writeups/pocs/04-bcrypt-e-oraculo.ts
 */

import path from 'path'
import { createRequire } from 'module'
import type { AddressInfo } from 'net'
import { passwordLimiter } from '../../../backend/src/middleware/rateLimit.middleware'

// bcryptjs e express são resolvidos a partir do backend: este arquivo fica fora
// dele, e um import normal procuraria o node_modules a partir de docs/.
const requireDoBackend = createRequire(path.join(__dirname, '../../../backend/package.json'))
const bcrypt = requireDoBackend('bcryptjs')
const express = requireDoBackend('express')

const LIMITE_BYTES_BCRYPT = 72
const bytes = (s: string) => new TextEncoder().encode(s).length

// A política antiga limitava só caracteres. A atual acrescenta o refine em
// bytes do auth.controller.ts, replicado aqui.
const passaNoMax64 = (s: string) => s.length <= 64
const cabeNoBcrypt = (s: string) => bytes(s) <= LIMITE_BYTES_BCRYPT

// 1. truncamento

async function truncamento() {
  // Cada um destes caracteres ocupa 2 bytes em UTF-8, então 36 deles são
  // exatamente os 72 bytes que o bcrypt lê. As duas senhas começam iguais e só
  // diferem depois disso, na parte que o bcrypt descarta.
  const comeco = 'çãõéüñ'.repeat(6)
  const senhaA = comeco + 'çãõéüñ' + 'a'.repeat(22)
  const senhaB = comeco + 'ñüéõãç' + 'b'.repeat(22)

  console.log('1. Truncamento do bcrypt (72 bytes)')
  for (const [nome, senha] of [['A', senhaA], ['B', senhaB]]) {
    console.log(
      `${nome} | chars: ${senha.length} | bytes: ${bytes(senha)} | ` +
      `max(64) antigo: ${passaNoMax64(senha) ? 'PASSA' : 'REJEITA'} | ` +
      `teto em bytes atual: ${cabeNoBcrypt(senha) ? 'PASSA' : 'REJEITA'}`
    )
  }

  const hashA = await bcrypt.hash(senhaA, 10)
  console.log(`A === B ?  ${senhaA === senhaB}`)
  console.log(`bcrypt.compare(B, hash de A) -> ${await bcrypt.compare(senhaB, hashA)}`)
  console.log()

  // Onde o corte acontece: o último caractere que ainda cabe inteiro nos 72 bytes.
  const caracteres = [...senhaA]
  let lidos = 0
  let ate = 0
  while (ate < caracteres.length && lidos + bytes(caracteres[ate]) <= LIMITE_BYTES_BCRYPT) {
    lidos += bytes(caracteres[ate])
    ate++
  }
  const descartados = caracteres.length - ate

  console.log(`Senha: ${caracteres.length} chars / ${bytes(senhaA)} bytes`)
  console.log(`bcrypt lê até o caractere ${ate} (${lidos} bytes)`)
  console.log(
    `IGNORADO em silêncio: ${descartados} caracteres, ` +
    `${Math.round((descartados / caracteres.length) * 100)}% da senha`
  )
  console.log()
  console.log(`Parte que conta : ${caracteres.slice(0, ate).join('')}`)
  console.log(`Parte descartada: ${caracteres.slice(ate).join('')}`)
}

// 2. custo do oráculo

async function custoDoOraculo() {
  console.log('2. Custo de cada chute contra o oráculo de senha')

  // Mesmo custo (10) e mesma chamada assíncrona que o auth.service.ts usa no
  // changePassword e no deleteAccount. A primeira comparação fica fora da
  // medição porque paga o aquecimento do JIT.
  const hash = await bcrypt.hash('senha verdadeira do usuario', 10)
  await bcrypt.compare('aquecimento', hash)

  const tentativas = 20
  const inicio = performance.now()
  for (let i = 0; i < tentativas; i++) {
    await bcrypt.compare(`chute errado ${i}`, hash)
  }
  const msPorTentativa = (performance.now() - inicio) / tentativas
  const emCincoMinutos = Math.floor((5 * 60 * 1000) / msPorTentativa)

  console.log(`bcrypt.compare (custo 10): ${msPorTentativa.toFixed(0)} ms por tentativa`)
  console.log(`Sem rate limit, 5 min de chutes sequenciais: ~${emCincoMinutos.toLocaleString('pt-BR')} tentativas`)
}

// 3. limitador compartilhado

async function limitadorCompartilhado() {
  console.log('3. passwordLimiter compartilhado entre as duas rotas')

  // A instância é a mesma que o auth.routes.ts coloca nas duas rotas. Os
  // handlers só respondem 200 e o authMiddleware fica de fora: o que está sob
  // teste é o limitador, e não a autenticação.
  const app = express()
  const responde = (_req: unknown, res: { json: (corpo: unknown) => void }) => res.json({ success: true })
  app.patch('/auth/me/password', passwordLimiter, responde)
  app.delete('/auth/me', passwordLimiter, responde)

  const server = app.listen(0)
  await new Promise(pronto => server.once('listening', pronto))
  const { port } = server.address() as AddressInfo

  // Alterna entre as rotas, como faria quem tenta dobrar o orçamento de chutes.
  const rotas = [['PATCH', '/auth/me/password'], ['DELETE', '/auth/me']] as const
  for (let i = 0; i < 8; i++) {
    const [metodo, rota] = rotas[i % 2]
    const res = await fetch(`http://127.0.0.1:${port}${rota}`, { method: metodo })
    const restantes = res.headers.get('ratelimit-remaining')
    console.log(
      `${String(i + 1).padStart(2)}. ${metodo.padEnd(6)} ${rota.padEnd(18)} -> ${res.status}` +
      `  RateLimit-Remaining: ${restantes}${res.status === 429 ? '  (bloqueado)' : ''}`
    )
  }

  server.close()
}

async function main() {
  await truncamento()
  console.log()
  await custoDoOraculo()
  console.log()
  await limitadorCompartilhado()
}

main().catch(erro => {
  console.error(erro)
  process.exit(1)
})
