import { Thread } from "@/tipos/board";
import ThreadCard from "../ThreadCard/ThreadCard";
import "@/componentes/ThreadList/ThreadList.css";

interface ThreadListProps {
    threads: Thread[];
}

export default function ThreadList({ threads }: ThreadListProps) {
    if (threads.length === 0) {
        return <p className="thread-list-empty">Nenhuma thread por aqui ainda.</p>;
    }

    return (
        <div className="thread-list">
            {threads.map((thread) => (
                <ThreadCard key={thread.id} thread={thread} />
            ))}
        </div>
    );
}
