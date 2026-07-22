import styles from "@/app/tech/tech.module.css";
import ThreadList from "@/componentes/ThreadList/ThreadList";
import { getBoard } from "@/services/board.services";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Home = visão do board único (tech): cabeçalho + lista de threads.
export default async function Home() {
    const cookieStore = await cookies();
    const token = cookieStore.get("token");

    if (!token) {
        redirect("/login");
    }

    const cookieHeader = cookieStore.toString();

    let board;
    try {
        board = await getBoard(cookieHeader);
    } catch {
        // token inválido/expirado -> /boards responde 401 e caímos aqui
        redirect("/login");
    }

    return (
        <main className={styles.home}>
            <div className={styles.homeHeader}>
                <div>
                    <h1>{board.name}</h1>
                    {board.description && <p>{board.description}</p>}
                </div>
            </div>

            <ThreadList threads={board.threads} />
        </main>
    );
}
