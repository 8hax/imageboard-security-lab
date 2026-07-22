import {
    ChangePasswordDTO,
    DeleteAccountDTO,
    LoginDTO,
    LoginResponse,
    Me,
    RegisterDTO,
    UpdateProfileDTO,
} from "@/tipos/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Registro: rota correta é /auth/register e o corpo precisa de username + email + password.
// O backend NÃO loga automaticamente (só cria o usuário), então quem chama redireciona para /login.
export async function register(dados: RegisterDTO): Promise<void> {
    const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
    });

    if (!response.ok) {
        const erro = await response.json().catch(() => null);
        throw new Error(erro?.error ?? "Erro ao criar usuário(a)");
    }
}

// Login: envia { email, password } e recebe { success }. O token vem num cookie httpOnly
// setado pelo backend, por isso credentials:"include" (para o navegador guardar o cookie).
export async function login(dados: LoginDTO): Promise<LoginResponse> {
    const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(dados),
    });

    if (!response.ok) {
        const erro = await response.json().catch(() => null);
        throw new Error(erro?.error ?? "Erro ao fazer login");
    }

    return response.json();
}

export async function logout(): Promise<void> {
    const response = await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
    });

    if (!response.ok) {
        throw new Error("Erro ao fazer logout");
    }
}

// GET /auth/me: dados do usuário logado (inclui isAdmin). Usado em server components,
// que repassam o cookie httpOnly como header Cookie. cache:"no-store" para refletir o estado atual.
export async function getMe(cookie?: string): Promise<Me> {
    const response = await fetch(`${API_URL}/auth/me`, {
        headers: { Cookie: cookie ?? "" },
        cache: "no-store",
    });

    if (!response.ok) {
        throw new Error("Falha ao carregar o usuário");
    }

    return response.json();
}

// PATCH /auth/me: edita username e/ou email do usuário logado. Retorna o usuário atualizado.
export async function updateProfile(dados: UpdateProfileDTO): Promise<Me> {
    const response = await fetch(`${API_URL}/auth/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(dados),
    });

    if (!response.ok) {
        const erro = await response.json().catch(() => null);
        throw new Error(erro?.error ?? "Erro ao atualizar o perfil");
    }

    return response.json();
}

// PATCH /auth/me/password: troca a senha (o backend exige a senha atual).
export async function changePassword(dados: ChangePasswordDTO): Promise<void> {
    const response = await fetch(`${API_URL}/auth/me/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(dados),
    });

    if (!response.ok) {
        const erro = await response.json().catch(() => null);
        throw new Error(erro?.error ?? "Erro ao trocar a senha");
    }
}

// DELETE /auth/me: exclui a conta (exige a senha). O backend limpa o cookie na resposta.
export async function deleteAccount(dados: DeleteAccountDTO): Promise<void> {
    const response = await fetch(`${API_URL}/auth/me`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(dados),
    });

    if (!response.ok) {
        const erro = await response.json().catch(() => null);
        throw new Error(erro?.error ?? "Erro ao excluir a conta");
    }
}
