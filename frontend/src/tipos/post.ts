import { Thread } from "./board";

// Nos includes o backend seleciona só estes campos do autor (não expõe email/senha).
export interface PostAuthor {
    id: string;
    username: string;
    isAI: boolean; // usado para mostrar o selo "IA" nos bots
}

export interface Post {
    id: string;
    content: string;
    imageUrl: string | null; // imagem opcional, estilo chan
    threadId: string;
    authorId: string;
    replyToId: string | null; // >> resposta a outro post
    createdAt: string;
}

// GET /boards/:slug/threads/:id — cada post vem com o autor (thread.service.findById).
export interface PostWithAuthor extends Post {
    author: PostAuthor;
}

// Resposta completa da thread: metadados + lista de posts com autor.
export interface ThreadWithPosts extends Thread {
    posts: PostWithAuthor[];
}

// GET /posts/user — cada post vem com um resumo da thread a que pertence.
export interface PostWithThread extends Post {
    thread: Pick<Thread, "id" | "title" | "slug">;
}

// Corpo do POST /posts (posts.controller lê content, threadId, imageUrl, replyToId).
export interface CreatePostDTO {
    content: string;
    threadId: string;
    imageUrl?: string;
    replyToId?: string; // preenchido ao responder a um post específico
}

// Alvo de "responder a": id curto (>>xxxx, para exibir) + id completo (para o backend).
export interface ReplyTarget {
    shortId: string;
    fullId: string;
}
