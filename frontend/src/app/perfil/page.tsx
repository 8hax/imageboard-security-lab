import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getMe } from "@/services/auth.services";
import PerfilForm from "@/componentes/PerfilForm/PerfilForm";
import styles from "@/app/perfil/perfil.module.css";

// Página protegida: gerencia a própria conta (editar perfil, trocar senha, excluir conta).
export default async function PerfilPage() {
    const cookieStore = await cookies();
    const token = cookieStore.get("token");

    if (!token) {
        redirect("/login");
    }

    let me;
    try {
        me = await getMe(cookieStore.toString());
    } catch {
        redirect("/login");
    }

    return (
        <main className={styles.perfil}>
            <h1>Minha conta</h1>
            <PerfilForm me={me} />
        </main>
    );
}
