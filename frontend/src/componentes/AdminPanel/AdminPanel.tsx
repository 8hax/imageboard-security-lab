"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setAI, gerarPosts } from "@/services/admin.services";
import { Thread } from "@/tipos/board";
import "@/componentes/AdminPanel/AdminPanel.css";

interface AdminPanelProps {
    initialAIActive: boolean;
    threads: Thread[];
}

// Client component: consome as rotas /admin via cookie httpOnly (credentials:"include"
// nos serviços). O estado da IA começa com o valor vindo do server (initialAIActive).
export default function AdminPanel({ initialAIActive, threads }: AdminPanelProps) {
    const [aiActive, setAiActive] = useState(initialAIActive);
    const [alterandoIA, setAlterandoIA] = useState(false);
    const [gerandoId, setGerandoId] = useState<string | null>(null);
    const router = useRouter();

    async function handleToggleAI() {
        setAlterandoIA(true);
        try {
            const status = await setAI(!aiActive);
            setAiActive(status.isAIActive);
            toast.success(status.isAIActive ? "IA ligada" : "IA desligada");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Erro ao alterar a IA");
        } finally {
            setAlterandoIA(false);
        }
    }

    async function handleGerarPosts(threadId: string) {
        setGerandoId(threadId);
        try {
            const resultado = await gerarPosts(threadId);
            toast.success(`${resultado.postsCriados} post(s) gerado(s) pela IA`);
            router.refresh();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Erro ao gerar posts");
        } finally {
            setGerandoId(null);
        }
    }

    return (
        <div className="admin-panel">
            {/* Chave geral da IA (SystemSettings.isAIActive) */}
            <section className="admin-card">
                <div className="admin-card-head">
                    <h2>Posts automáticos da IA</h2>
                    <span className={`admin-status ${aiActive ? "on" : "off"}`}>
                        {aiActive ? "LIGADA" : "DESLIGADA"}
                    </span>
                </div>
                <p className="admin-hint">
                    Quando ligada, um bot posta automaticamente a cada 5 minutos numa
                    thread aleatória.
                </p>
                <button
                    className={`admin-toggle ${aiActive ? "is-on" : "is-off"}`}
                    onClick={handleToggleAI}
                    disabled={alterandoIA}
                >
                    {alterandoIA ? "Alterando..." : aiActive ? "Desligar IA" : "Ligar IA"}
                </button>
            </section>

            {/* Disparo manual por thread (ignora a chave geral, de propósito) */}
            <section className="admin-card">
                <div className="admin-card-head">
                    <h2>Gerar posts manualmente</h2>
                </div>
                <p className="admin-hint">
                    Dispara uma rodada imediata (cada bot responde uma vez na thread),
                    mesmo com a IA desligada.
                </p>
                {threads.length === 0 ? (
                    <p className="admin-empty">Nenhuma thread disponível.</p>
                ) : (
                    <ul className="admin-thread-list">
                        {threads.map((thread) => (
                            <li key={thread.id} className="admin-thread">
                                <span className="admin-thread-title">{thread.title}</span>
                                <button
                                    className="admin-gerar"
                                    onClick={() => handleGerarPosts(thread.id)}
                                    disabled={gerandoId !== null}
                                >
                                    {gerandoId === thread.id ? "Gerando..." : "Gerar posts"}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}
