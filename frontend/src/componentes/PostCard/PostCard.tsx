"use client";

import { Fragment } from "react";
import { PostWithAuthor, ReplyTarget } from "@/tipos/post";
import DeletePostButton from "@/componentes/DeletePostButton/DeletePostButton";
import "@/componentes/PostCard/PostCard.css";

interface PostCardProps {
    post: PostWithAuthor;
    // usuário logado (vindo do server component da thread) para decidir o botão de deletar
    currentUserId?: string;
    isAdmin?: boolean;
    backlinks?: string[]; // ids curtos dos posts que responderam a este
    onReply?: (target: ReplyTarget) => void;
}

function formatarData(iso: string) {
    return new Date(iso).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

// Renderiza o conteúdo com cara de chan:
// - linhas começando com ">" (mas não ">>") viram greentext;
// - tokens ">>abc123" viram quote-links que rolam até o post citado (#post-abc123).
function renderConteudo(texto: string) {
    return texto.split("\n").map((linha, i) => {
        const semEspaco = linha.trimStart();
        const isGreentext = semEspaco.startsWith(">") && !semEspaco.startsWith(">>");

        const partes = linha.split(/(>>[a-z0-9]+)/gi).map((parte, j) => {
            if (/^>>[a-z0-9]+$/i.test(parte)) {
                const alvo = parte.slice(2);
                return (
                    <a key={j} href={`#post-${alvo}`} className="post-quote">
                        {parte}
                    </a>
                );
            }
            return <Fragment key={j}>{parte}</Fragment>;
        });

        return (
            <span key={i} className={isGreentext ? "greentext" : undefined}>
                {partes}
                {"\n"}
            </span>
        );
    });
}

// Post no feed da thread. O botão de deletar aparece para o dono do post ou admin;
// a autorização de verdade é do backend (posts.service.delete).
export default function PostCard({ post, currentUserId, isAdmin, backlinks = [], onReply }: PostCardProps) {
    const numero = post.id.slice(0, 8); // nº curto estilo chan a partir do uuid
    const podeDeletar = Boolean(isAdmin || (currentUserId && post.author.id === currentUserId));
    const respondendoA = post.replyToId ? post.replyToId.slice(0, 8) : null;

    return (
        <article id={`post-${numero}`} className={`post-card${post.author.isAI ? " is-ai" : ""}`}>
            <header className="post-card-head">
                <span className="post-author">{post.author.username}</span>
                {post.author.isAI && <span className="post-badge-ia">IA</span>}
                <span className="post-date">{formatarData(post.createdAt)}</span>
                {onReply ? (
                    <button
                        type="button"
                        className="post-num"
                        onClick={() => onReply({ shortId: numero, fullId: post.id })}
                        title="Responder a este post"
                    >
                        No.{numero}
                    </button>
                ) : (
                    <span className="post-num">No.{numero}</span>
                )}
                {podeDeletar && <DeletePostButton postId={post.id} />}
            </header>

            {respondendoA && (
                <p className="post-reply-to">
                    respondendo a{" "}
                    <a href={`#post-${respondendoA}`} className="post-quote">{`>>${respondendoA}`}</a>
                </p>
            )}

            {post.imageUrl && (
                // URL arbitrária do usuário (host/dimensão desconhecidos): <img> puro é mais robusto que next/image.
                // eslint-disable-next-line @next/next/no-img-element
                <img className="post-image" src={post.imageUrl} alt="Imagem do post" />
            )}

            <p className="post-content">{renderConteudo(post.content)}</p>

            {backlinks.length > 0 && (
                <p className="post-backlinks">
                    respondido por{" "}
                    {backlinks.map((b, i) => (
                        <Fragment key={b}>
                            {i > 0 && " "}
                            <a href={`#post-${b}`} className="post-quote">{`>>${b}`}</a>
                        </Fragment>
                    ))}
                </p>
            )}
        </article>
    );
}
