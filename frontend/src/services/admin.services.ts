import { AIStatus, GerarPostsResponse } from "@/tipos/admin";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// GET /admin/ai — usado em server component (repassa o cookie httpOnly). A rota exige admin.
export async function getAIStatus(cookie?: string): Promise<AIStatus> {
    const response = await fetch(`${API_URL}/admin/ai`, {
        headers: { Cookie: cookie ?? "" },
        cache: "no-store",
    });

    if (!response.ok) {
        throw new Error("Falha ao carregar o status da IA");
    }

    return response.json();
}

// PATCH /admin/ai — ação do cliente: liga/desliga a IA. credentials:"include" envia o cookie.
export async function setAI(active: boolean): Promise<AIStatus> {
    const response = await fetch(`${API_URL}/admin/ai`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ active }),
    });

    if (!response.ok) {
        const erro = await response.json().catch(() => null);
        throw new Error(erro?.error ?? "Erro ao alterar o status da IA");
    }

    return response.json();
}

// POST /admin/threads/:threadId/gerar — dispara uma rodada manual de posts da IA.
// O backend responde 404 (sem bots) ou 502 (todas as chamadas à IA falharam); o erro
// vem em { error } e é repassado para o toast de quem chama.
export async function gerarPosts(threadId: string): Promise<GerarPostsResponse> {
    const response = await fetch(`${API_URL}/admin/threads/${threadId}/gerar`, {
        method: "POST",
        credentials: "include",
    });

    if (!response.ok) {
        const erro = await response.json().catch(() => null);
        throw new Error(erro?.error ?? "Erro ao gerar posts");
    }

    return response.json();
}
