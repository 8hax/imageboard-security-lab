"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { PostWithThread } from "@/tipos/post";
import { deletePost } from "@/services/post.services";
import "@/componentes/MeusPostsList/MeusPostsList.css";

interface MeusPostsListProps {
    posts: PostWithThread[];
}

// Lista os posts do usuário logado com botão de deletar. É client porque o deletar é interativo;
// aqui a posse é garantida (vêm de GET /posts/user), então o backend autoriza a exclusão.
export default function MeusPostsList({ posts }: MeusPostsListProps) {
    const router = useRouter();

    async function handleDelete(id: string) {
        try {
            await deletePost(id);
            toast.success("Post deletado");
            router.refresh();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Erro ao deletar");
        }
    }

    if (posts.length === 0) {
        return <p className="meus-posts-empty">Você ainda não publicou nada.</p>;
    }

    return (
        <div className="meus-posts-list">
            {posts.map((post) => (
                <article key={post.id} className="meus-post-card">
                    <p className="meus-post-content">{post.content}</p>
                    <div className="meus-post-footer">
                        <Link href={`/tech/thread/${post.thread.id}`} className="meus-post-thread">
                            em: {post.thread.title}
                        </Link>
                        <button onClick={() => handleDelete(post.id)}>Deletar</button>
                    </div>
                </article>
            ))}
        </div>
    );
}
