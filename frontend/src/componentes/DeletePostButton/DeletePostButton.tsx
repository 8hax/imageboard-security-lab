"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deletePost } from "@/services/post.services";

interface DeletePostButtonProps {
    postId: string;
}

// Botão de deletar dentro da thread. Client (ação interativa).
// A autorização real é do backend (posts.service.delete: dono ou admin);
// aqui só mostramos o botão quando faz sentido e chamamos o endpoint.
export default function DeletePostButton({ postId }: DeletePostButtonProps) {
    const router = useRouter();
    const [deletando, setDeletando] = useState(false);

    async function handleDelete() {
        if (!confirm("Apagar este post? Essa ação não pode ser desfeita.")) return;

        setDeletando(true);
        try {
            await deletePost(postId);
            toast.success("Post apagado");
            router.refresh();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Erro ao apagar");
            setDeletando(false);
        }
    }

    return (
        <button
            type="button"
            className="post-delete"
            onClick={handleDelete}
            disabled={deletando}
            title="Apagar post"
            aria-label="Apagar post"
        >
            {deletando ? "…" : "✕"}
        </button>
    );
}
