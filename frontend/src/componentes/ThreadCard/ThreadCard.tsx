import Link from "next/link";
import { Thread } from "@/tipos/board";
import "@/componentes/ThreadCard/ThreadCard.css";

interface ThreadCardProps {
    thread: Thread;
}

// Cartão de uma thread na home. É só um link para /thread/[id], então não precisa ser client.
export default function ThreadCard({ thread }: ThreadCardProps) {
    return (
        <Link href={`/tech/thread/${thread.id}`} className="thread-card">
            <h2>{thread.title}</h2>
            <p>{thread.description}</p>
        </Link>
    );
}
