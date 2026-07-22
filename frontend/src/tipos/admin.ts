// Respostas das rotas de admin (backend/src/controllers/admin.controller.ts).

// GET /admin/ai e PATCH /admin/ai — estado da chave geral da IA.
export interface AIStatus {
    isAIActive: boolean;
}

// POST /admin/threads/:threadId/gerar — resultado de uma rodada manual.
export interface GerarPostsResponse {
    success: boolean;
    postsCriados: number;
}
