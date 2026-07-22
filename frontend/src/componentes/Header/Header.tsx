import "@/componentes/Header/Header.css";
import { cookies } from "next/headers";
import Link from "next/link";
import Logout from "../Logout/Logout";
import { getMe } from "@/services/auth.services";

// Server component: lê o cookie httpOnly "token" para decidir o que mostrar (logado vs. deslogado).
export default async function Header() {
    const cookieStore = await cookies();
    const token = cookieStore.get("token");

    // O link do painel só aparece para admins. Se /auth/me falhar (token expirado, etc.),
    // trata como não-admin. O backend continua sendo o gate real das rotas /admin.
    let isAdmin = false;
    if (token) {
        try {
            const me = await getMe(cookieStore.toString());
            isAdmin = me.isAdmin;
        } catch {
            isAdmin = false;
        }
    }

    return (
        <header className="header">
            <nav>
                <ul>
                    <li>
                        <Link href="/">/tech/</Link>
                    </li>
                    {token && (
                        <li>
                            <Link href="/meus-posts">Meus posts</Link>
                        </li>
                    )}
                    {isAdmin && (
                        <li>
                            <Link href="/admin">Admin</Link>
                        </li>
                    )}
                </ul>
            </nav>

            <div>
                <ul>
                    {!token && (
                        <>
                            <li>
                                <Link href="/login">Login</Link>
                            </li>
                            <li>
                                <Link href="/create">Criar Conta</Link>
                            </li>
                        </>
                    )}
                    {token && (
                        <>
                            <li>
                                <Link href="/perfil">Perfil</Link>
                            </li>
                            <li><Logout /></li>
                        </>
                    )}
                </ul>
            </div>
        </header>
    );
}
