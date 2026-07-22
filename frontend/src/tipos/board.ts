// Espelha os models Board/Thread do Prisma (backend/prisma/schema.prisma).
// Datas chegam como string (JSON), não Date.

export interface Thread {
    id: string;
    title: string;
    slug: string;
    description: string;
    boardId: string;
    createdAt: string;
}

export interface Board {
    id: string;
    name: string;
    slug: string;
    description: string | null; // opcional no schema
    createdAt: string;
}

// Resposta de GET /boards/:slug — o board já vem com suas threads (board.services.findBySlug).
export interface BoardWithThreads extends Board {
    threads: Thread[];
}
