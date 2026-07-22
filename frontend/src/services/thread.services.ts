import { ThreadWithPosts } from "@/tipos/post";
import { BOARD_SLUG } from "./board.services";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// GET /boards/:slug/threads/:id devolve a thread já com os posts e seus autores.
// Server-side: repassa o cookie (rota protegida).
export async function getThread(id: string, cookie?: string): Promise<ThreadWithPosts> {
    const response = await fetch(`${API_URL}/boards/${BOARD_SLUG}/threads/${id}`, {
        headers: { Cookie: cookie ?? "" },
        cache: "no-store",
    });

    if (!response.ok) {
        throw new Error("Falha ao carregar a thread");
    }

    return response.json();
}
