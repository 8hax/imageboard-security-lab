"use client";

import { useState } from "react";
import { PostWithAuthor, ReplyTarget } from "@/tipos/post";
import PostCard from "@/componentes/PostCard/PostCard";
import PostComposer from "@/componentes/PostComposer/PostComposer";
import "@/componentes/ThreadView/ThreadView.css";

interface ThreadViewProps {
    threadId: string;
    posts: PostWithAuthor[];
    currentUserId?: string;
    isAdmin?: boolean;
}

// Junta o feed de posts e o formulário num mesmo client component para
// compartilhar o "responder a" (replyTo) sem precisar de context: o botão de
// resposta de cada PostCard define o alvo, e o PostComposer envia o replyToId.
export default function ThreadView({ threadId, posts, currentUserId, isAdmin }: ThreadViewProps) {
    const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);

    // Backlinks: para cada post, os ids curtos dos posts que responderam a ele.
    const backlinks = new Map<string, string[]>();
    for (const p of posts) {
        if (p.replyToId) {
            const lista = backlinks.get(p.replyToId) ?? [];
            lista.push(p.id.slice(0, 8));
            backlinks.set(p.replyToId, lista);
        }
    }

    function handleReply(target: ReplyTarget) {
        setReplyTo(target);
        // leva o usuário até o formulário de resposta
        document
            .getElementById("composer")
            ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    return (
        <>
            <section className="thread-posts">
                {posts.length === 0 ? (
                    <p className="thread-vazio">Nenhum post ainda. Seja o primeiro!</p>
                ) : (
                    posts.map((post) => (
                        <PostCard
                            key={post.id}
                            post={post}
                            currentUserId={currentUserId}
                            isAdmin={isAdmin}
                            backlinks={backlinks.get(post.id) ?? []}
                            onReply={handleReply}
                        />
                    ))
                )}
            </section>

            <PostComposer
                threadId={threadId}
                replyTo={replyTo}
                onClearReply={() => setReplyTo(null)}
            />
        </>
    );
}
