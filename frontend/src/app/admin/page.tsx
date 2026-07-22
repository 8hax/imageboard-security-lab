import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getMe } from "@/services/auth.services";
import { getAIStatus } from "@/services/admin.services";
import { getBoard } from "@/services/board.services";
import AdminPanel from "@/componentes/AdminPanel/AdminPanel";
import styles from "@/app/admin/admin.module.css";

// Página protegida: exige login E privilégio de admin — a mesma regra do
// adminMiddleware no backend. O gate aqui é só de UX; o backend continua sendo
// quem realmente autoriza cada rota /admin.
export default async function AdminPage() {
    const cookieStore = await cookies();
    const token = cookieStore.get("token");

    if (!token) {
        redirect("/login");
    }

    const cookieHeader = cookieStore.toString();

    // Confirma que o usuário é admin antes de mostrar qualquer coisa.
    let me;
    try {
        me = await getMe(cookieHeader);
    } catch {
        redirect("/login");
    }

    if (!me.isAdmin) {
        redirect("/");
    }

    // Status atual da IA + threads (para os botões de gerar posts manualmente).
    const [status, board] = await Promise.all([
        getAIStatus(cookieHeader),
        getBoard(cookieHeader),
    ]);

    return (
        <main className={styles.admin}>
            <h1>Painel de administração</h1>
            <AdminPanel initialAIActive={status.isAIActive} threads={board.threads} />
        </main>
    );
}
