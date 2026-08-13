import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma'
import bcrypt from 'bcryptjs'

// Usuário placeholder que "herda" os posts de contas excluídas (anonimização).
const DELETED_USER_ID = 'deleted_user'

// Hash descartável usado no login quando a conta não existe / é bot / não tem
// senha. Serve para o bcrypt.compare rodar SEMPRE com o mesmo custo (10),
// de modo que o tempo de resposta não revele se o email existe — mitiga a
// enumeração de usuários por timing. É o hash de uma senha aleatória: nenhuma
// senha informada pelo usuário jamais confere com ele.
const DUMMY_HASH = bcrypt.hashSync('conta-inexistente-timing-guard', 10)

export class AuthService {

  async create(username: string, email: string, password: string) {

    //fazer o hash da password antes para que evite um pouco do timing
    const passwordHashed = await bcrypt.hash(password, 10)

    const isUserCreated = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { email }]
      }
    })

    if (isUserCreated) {
      throw new Error('Não foi possível concluir o cadastro. Verifique os dados e tente novamente')
    }

    const user = await prisma.user.create({
      data: { username, email, password: passwordHashed }
    })

    return { id: user.id, username: user.username, email: user.email }
  }

  async me(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      isAdmin: true,
      isAI: true,
      createdAt: true,
    }
  })
}

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email }
    })

    // Uma conta só é elegível ao login se existe, não é bot e tem senha.
    const contaValida = !!user && !user.isAI && !!user.password

    // O bcrypt.compare roda SEMPRE, com o mesmo custo: contra a senha real
    // quando a conta é válida, ou contra um hash descartável caso contrário.
    // Assim o tempo de resposta não revela se o email existe (anti-enumeração).
    const hashParaComparar = contaValida ? user!.password! : DUMMY_HASH
    const senhaMatch = await bcrypt.compare(password, hashParaComparar)

    // Mensagem única para todos os motivos de falha, sem distinguir os casos.
    if (!contaValida || !senhaMatch) {
      throw new Error('Dados inválidos')
    }

    // Após o guard acima, contaValida é true — logo user não é nulo.
    const token = jwt.sign(
      { id: user!.id, username: user!.username, isAdmin: user!.isAdmin },
      process.env.JWT_SECRET!,
      { expiresIn: '5h' }
    )

    return { token }
  }

  // Atualiza username e/ou email. Garante que não colidam com OUTRO usuário.
  async updateProfile(userId: string, data: { username?: string; email?: string }) {
    const { username, email } = data

    const conflito = await prisma.user.findFirst({
      where: {
        NOT: { id: userId },
        OR: [
          ...(username ? [{ username }] : []),
          ...(email ? [{ email }] : []),
        ],
      },
    })

    if (conflito) {
      throw new Error('Não foi possível atualizar o perfil. Verifique os dados e tente novamente')
    }

    return prisma.user.update({
      where: { id: userId },
      data: {
        ...(username !== undefined && { username }),
        ...(email !== undefined && { email }),
      },
      select: {
        id: true,
        username: true,
        email: true,
        isAdmin: true,
        isAI: true,
        createdAt: true,
      },
    })
  }

  // Troca a senha exigindo a senha atual como confirmação.
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } })

    if (!user || !user.password) {
      throw new Error('Usuário inválido')
    }

    const confere = await bcrypt.compare(currentPassword, user.password)
    if (!confere) {
      throw new Error('Senha atual incorreta')
    }

    const novaHash = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({
      where: { id: userId },
      data: { password: novaHash },
    })
  }

  // Exclui a conta (exige a senha atual). Anonimiza: reatribui os posts do
  // usuário ao placeholder "[deletado]" e então apaga o usuário — tudo em transação.
  async deleteAccount(userId: string, password: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } })

    if (!user || !user.password) {
      throw new Error('Usuário inválido')
    }

    const confere = await bcrypt.compare(password, user.password)
    if (!confere) {
      throw new Error('Senha incorreta')
    }

    await prisma.$transaction(async (tx) => {
      // garante o usuário placeholder que herda os posts
      await tx.user.upsert({
        where: { id: DELETED_USER_ID },
        update: {},
        create: {
          id: DELETED_USER_ID,
          username: '[deletado]',
          email: 'deleted@system.local',
          password: null,
          isAI: false,
          isAdmin: false,
        },
      })

      // reatribui os posts ao placeholder (mantém o histórico das threads)
      await tx.post.updateMany({
        where: { authorId: userId },
        data: { authorId: DELETED_USER_ID },
      })

      await tx.user.delete({ where: { id: userId } })
    })
  }

}