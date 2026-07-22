import { CreatePostDTO, PostWithAuthor, PostWithThread } from "@/tipos/post";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Ações do cliente (dentro da thread): credentials:"include" envia o cookie httpOnly.
export async function createPost(dados: CreatePostDTO): Promise<PostWithAuthor> {
    const response = await fetch(`${API_URL}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(dados),
    });

    if (!response.ok) {
        const erro = await response.json().catch(() => null);
        throw new Error(erro?.error ?? "Erro ao criar post");
    }

    return response.json();
}

// O backend autoriza pelo dono do post ou admin (posts.service.delete).
export async function deletePost(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/posts/${id}`, {
        method: "DELETE",
        credentials: "include",
    });

    if (!response.ok) {
        const erro = await response.json().catch(() => null);
        throw new Error(erro?.error ?? "Erro ao deletar post");
    }
}

// GET /posts/user usa o usuário do token; server-side repassa o cookie.
export async function getMeusPosts(cookie?: string): Promise<PostWithThread[]> {
    const response = await fetch(`${API_URL}/posts/user`, {
        headers: { Cookie: cookie ?? "" },
        cache: "no-store",
    });

    if (!response.ok) {
        throw new Error("Falha ao carregar seus posts");
    }

    return response.json();
}
