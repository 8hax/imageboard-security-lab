import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import bcrypt from 'bcryptjs'

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? 'file:./dev.db',
})

const prisma = new PrismaClient({ adapter })

async function main() {

  // 1. BOARD
  const board = await prisma.board.upsert({
    where: { slug: 'tech' },
    update: {},
    create: {
      name: 'Tecnologia & Programação',
      slug: 'tech',
      description: 'Discussões sobre desenvolvimento, ferramentas e cultura tech.',
    },
  })

  console.log('Board criado', board.slug)

  // 2. USUÁRIOS IA
  const bots = await Promise.all([
    prisma.user.upsert({
      where: { email: 'anon_bot@chan.ai' },
      update: {},
      create: {
        username: 'Anon',
        email: 'anon_bot@chan.ai',
        password: null,
        isAI: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'dev_bot@chan.ai' },
      update: {},
      create: {
        username: 'DevBot',
        email: 'dev_bot@chan.ai',
        password: null,
        isAI: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'sage_bot@chan.ai' },
      update: {},
      create: {
        username: 'Sage',
        email: 'sage_bot@chan.ai',
        password: null,
        isAI: true,
      },
    }),
  ])

  console.log('Bots criados', bots.map(b => b.username))

  // 3. ADMINISTRADORES
  // A senha vem do .env (SEED_ADMIN_PASSWORD) para não ficar exposta no repositório.
  const senhaAdminPlana = process.env.SEED_ADMIN_PASSWORD
  if (!senhaAdminPlana) {
    throw new Error(
      'SEED_ADMIN_PASSWORD não definida. Defina-a no backend/.env antes de rodar o seed (veja backend/.env.example).',
    )
  }
  // a senha é hasheada com bcrypt antes de salvar — nunca salvamos texto puro!
  const senhaAdmin = await bcrypt.hash(senhaAdminPlana, 10)

  const admins = await Promise.all([
    prisma.user.upsert({
      where: { email: 'boaz@admin.chan' },
      update: { password: senhaAdmin }, // atualiza senha se já existir
      create: {
        username: 'Boaz',
        email: 'boaz@admin.chan',
        password: senhaAdmin,
        isAdmin: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'gustavo@admin.chan' },
      update: { password: senhaAdmin }, // atualiza senha se já existir
      create: {
        username: 'Gustavo',
        email: 'gustavo@admin.chan',
        password: senhaAdmin,
        isAdmin: true,
      },
    }),
  ])

  console.log('Admins criados:', admins.map(a => a.username))

  // 4. LIGANDO A CHAVE GERAL DA IA
  await prisma.systemSettings.upsert({
    where: { id: 'global_settings' },
    update: {},
    create: {
      id: 'global_settings',
      isAIActive: true,
    },
  })

  console.log('Configurações do sistema criadas e IA ativada.')

  // 5. THREADS
  const threadsData = [
    {
      title: 'IAs como Copilot e Gemini vão destruir a base da internet?',
      slug: 'ia-substituindo-devs',
      description: 'Debate: O código gerado por IA está emburrecendo os juniores ou é a evolução natural? Deixem suas opiniões.',
    },
    {
      title: 'Vanguard quebrando o Windows e o inferno do Secure Boot',
      slug: 'vanguard-secure-boot-erros',
      description: 'Tópico de suporte e desabafo. Como resolver conflitos de anti-cheat no nível do kernel bloqueando a inicialização da máquina.',
    },
    {
      title: 'NPM infectado (de novo). Até quando vamos confiar em código de terceiros?',
      slug: 'npm-infectado-supply-chain',
      description: 'Mais um pacote popular foi injetado com malware. Como vocês lidam com ataques de supply chain? Usar Node virou roleta russa?',
    },
  ]

  const threads = await Promise.all(
    threadsData.map(t =>
      prisma.thread.upsert({
        where: { boardId_slug: { boardId: board.id, slug: t.slug } },
        update: {},
        create: { ...t, boardId: board.id },
      })
    )
  )

  console.log('Threads criadas com sucesso', threads.map(t => t.slug))
}

main()
  .catch((e) => {
    console.error('Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })