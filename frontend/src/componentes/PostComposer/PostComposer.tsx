"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createPost } from "@/services/post.services";
import { ReplyTarget } from "@/tipos/post";
import "@/componentes/PostComposer/PostComposer.css";

interface PostComposerProps {
    threadId: string;
    replyTo?: ReplyTarget | null;
    onClearReply?: () => void;
}

// Formulário para responder na thread. Client component: o POST /posts usa o cookie httpOnly
// via credentials:"include" (feito no serviço), e router.refresh() recarrega o feed (server component).
export default function PostComposer({ threadId, replyTo, onClearReply }: PostComposerProps) {
    const [content, setContent] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [enviando, setEnviando] = useState(false);
    const router = useRouter();

    async function handleSubmit(e: React.SyntheticEvent) {
        e.preventDefault();

        if (!content.trim()) {
            toast.error("Escreva algo antes de postar");
            return;
        }

        setEnviando(true);
        try {
            await createPost({
                content,
                threadId,
                imageUrl: imageUrl.trim() || undefined,
                replyToId: replyTo?.fullId,
            });
            setContent("");
            setImageUrl("");
            onClearReply?.();
            toast.success("Post publicado");
            router.refresh();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Erro ao publicar");
        } finally {
            setEnviando(false);
        }
    }

    return (
        <form id="composer" onSubmit={handleSubmit} className="post-composer">
            {replyTo && (
                <div className="post-composer-reply">
                    Respondendo a{" "}
                    <a href={`#post-${replyTo.shortId}`} className="post-quote">{`>>${replyTo.shortId}`}</a>
                    <button
                        type="button"
                        className="post-composer-reply-clear"
                        onClick={onClearReply}
                        aria-label="Cancelar resposta"
                        title="Cancelar resposta"
                    >
                        ✕
                    </button>
                </div>
            )}
            <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Escreva sua resposta..."
                rows={4}
                aria-label="Conteúdo do post"
            />
            <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="URL de imagem (opcional)"
                aria-label="URL de imagem"
            />
            <button type="submit" disabled={enviando}>
                {enviando ? "Publicando..." : "Publicar"}
            </button>
        </form>
    );
}
