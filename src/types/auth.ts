/**
 * Tipos de autenticação, contas de usuário (cidadão e administrador),
 * sessão persistente e resposta do ViaCEP.
 */

export type UserRole = 'user' | 'admin';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  cep: string;
  street?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  contact?: string;
  passwordHash: string;
  createdAt: string;
}

export interface AuthSession {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  cep: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  contact?: string;
  loggedInAt: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  cep: string;
  password: string;
  confirmPassword: string;
  street?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  contact?: string;
}

export interface ViaCepAddress {
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
}
