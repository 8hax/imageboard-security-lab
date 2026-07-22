import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getThread } from "@/services/thread.services";
import { getMe } from "@/services/auth.services";
import ThreadView from "@/componentes/ThreadView/ThreadView";
import styles from "@/app/tech/thread/thread.module.css";

interface Props {
    params: Promise<{ id: string }>;
}

export default async function ThreadPage({ params }: Props) {
    const cookieStore = await cookies();
    const token = cookieStore.get("token");

    if (!token) {
        redirect("/login");
    }

    const { id } = await params;
    const cookieHeader = cookieStore.toString();

    let thread;
    try {
        thread = await getThread(id, cookieHeader);
    } catch {
        // thread inexistente ou sessão inválida -> volta pra home
        // (se o token tiver expirado, a home então redireciona para /login)
        redirect("/");
    }

    // usuário atual: decide quais posts mostram o botão de deletar (dono ou admin).
    // Se falhar, seguimos sem botões em vez de quebrar a página.
    let currentUser = null;
    try {
        currentUser = await getMe(cookieHeader);
    } catch {
        currentUser = null;
    }

    return (
        <main className={styles.thread}>
            <Link href="/" className={styles.voltar}>← voltar</Link>

            <header className={styles.threadHeader}>
                <h1>{thread.title}</h1>
                <p>{thread.description}</p>
            </header>

            <ThreadView
                threadId={thread.id}
                posts={thread.posts}
                currentUserId={currentUser?.id}
                isAdmin={currentUser?.isAdmin}
            />
        </main>
    );
}
