// Corpo enviado no login: o backend (auth.controller loginSchema) espera "password", não "senha".
export interface LoginDTO {
    email: string;
    password: string;
}

// Registro exige username + email + password (auth.controller createSchema).
export interface RegisterDTO {
    username: string;
    email: string;
    password: string;
}

// O login NÃO devolve o token no corpo: ele grava um cookie httpOnly "token"
// e responde apenas { success: true }.
export interface LoginResponse {
    success: boolean;
}

// Resposta de GET /auth/me (auth.service.me): dados do usuário autenticado.
export interface Me {
    id: string;
    username: string;
    email: string;
    isAdmin: boolean;
    isAI: boolean;
    createdAt: string;
}

// PATCH /auth/me — editar perfil (username e/ou email).
export interface UpdateProfileDTO {
    username: string;
    email: string;
}

// PATCH /auth/me/password — trocar a senha (exige a senha atual).
export interface ChangePasswordDTO {
    currentPassword: string;
    newPassword: string;
}

// DELETE /auth/me — excluir a conta (exige a senha como confirmação).
export interface DeleteAccountDTO {
    password: string;
}
