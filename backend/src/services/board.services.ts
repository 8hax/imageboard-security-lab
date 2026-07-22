import prisma from "../lib/prisma"

export class BoardService {

  async findBySlug(slug: string) {
    return prisma.board.findUnique({
      where: { slug },
      include: {
        threads: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })
  }

}