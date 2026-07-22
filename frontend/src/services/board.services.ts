import { BoardWithThreads } from "@/tipos/board";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// O seed cria um único board e o backend não expõe listagem de boards,
// então fixamos o slug aqui e reaproveitamos em toda a navegação.
export const BOARD_SLUG = "tech";

// Usado em server components: repassa o cookie httpOnly como header, pois /boards é protegido.
// cache:"no-store" para sempre refletir threads/posts atuais.
export async function getBoard(cookie?: string): Promise<BoardWithThreads> {
    const response = await fetch(`${API_URL}/boards/${BOARD_SLUG}`, {
        headers: { Cookie: cookie ?? "" },
        cache: "no-store",
    });

    if (!response.ok) {
        throw new Error("Falha ao carregar o board");
    }

    return response.json();
}
