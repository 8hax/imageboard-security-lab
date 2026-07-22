import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getMeusPosts } from "@/services/post.services";
import MeusPostsList from "@/componentes/MeusPostsList/MeusPostsList";
import styles from "@/app/meus-posts/meus-posts.module.css";

export default async function MeusPostsPage() {
    const cookieStore = await cookies();
    const token = cookieStore.get("token");

    if (!token) {
        redirect("/login");
    }

    const cookieHeader = cookieStore.toString();

    let posts;
    try {
        posts = await getMeusPosts(cookieHeader);
    } catch {
        redirect("/login");
    }

    return (
        <main className={styles.meusPosts}>
            <h1>Meus posts</h1>
            <MeusPostsList posts={posts} />
        </main>
    );
}
