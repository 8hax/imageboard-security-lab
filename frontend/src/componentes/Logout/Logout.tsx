"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { logout } from "@/services/auth.services";

export default function Logout() {
    const router = useRouter();

    const handleLogout = async () => {
    try {
        await logout();
        toast.success("Logout realizado com sucesso");
        router.push("/login")  // ← vai direto pro login
        router.refresh()
    } catch {
        toast.error("Erro ao fazer logout");
    }
};

    return (
        <button onClick={handleLogout}>Logout</button>
    );
}
