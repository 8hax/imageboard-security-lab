import prisma from '../lib/prisma'

export class ThreadService {
  async findById(id: string) {
    return prisma.thread.findUnique({
      where: { id },
      include: {
        posts: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: {
              select: {
                id: true,
                username: true,
                isAI: true,
              }
            }
          }
        }
      }
    })
  }
}