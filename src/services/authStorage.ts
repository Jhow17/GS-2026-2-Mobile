/**
 * Armazenamento de contas e sessão persistente no AsyncStorage (M5 - Opção 4A).
 * Semeia automaticamente a conta de Administrador no primeiro boot a partir de
 * ADMIN_SEED_EMAIL e ADMIN_SEED_PASSWORD (appConfig.ts).
 *
 * AVISO DE SEGURANÇA (PoC client-side):
 * O hash determinístico abaixo evita salvar a senha em texto puro no AsyncStorage,
 * porém em qualquer aplicativo 100% client-side o bundle e o armazenamento local
 * pertencem ao dispositivo do usuário. Em produção real, autenticação e controle
 * de acesso (role = 'admin') devem ocorrer exclusivamente no backend.
 */
import { ADMIN_SEED_EMAIL, ADMIN_SEED_PASSWORD } from '../config/appConfig';
import type { AuthSession, LoginInput, RegisterInput, UserAccount, UserRole } from '../types/auth';
import { formatCep } from '../utils/formatters';
import { generateId } from '../utils/generateId';
import { isRecord } from '../utils/validation';
import {
  readStoredJson,
  removeStoredKey,
  STORAGE_PREFIX,
  writeStoredJson,
} from './cacheStorage';

const ACCOUNTS_KEY = `${STORAGE_PREFIX}accounts`;
const SESSION_KEY = `${STORAGE_PREFIX}session`;
const ADMIN_ACCOUNT_ID = 'admin_seed_citizentech';

/** Hash determinístico FNV-1a (64-bit simulado em hex) para prova de conceito local. */
export function hashPasswordLocal(password: string, emailSalt: string): string {
  const input = `citizentech:${emailSalt.trim().toLowerCase()}:${password}`;
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `v1$${(h2 >>> 0).toString(16).padStart(8, '0')}${(h1 >>> 0).toString(16).padStart(8, '0')}`;
}

function isUserRole(value: unknown): value is UserRole {
  return value === 'user' || value === 'admin';
}

function isUserAccount(value: unknown): value is UserAccount {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.email === 'string' &&
    isUserRole(value.role) &&
    typeof value.cep === 'string' &&
    typeof value.passwordHash === 'string' &&
    typeof value.createdAt === 'string'
  );
}

function isUserAccountList(value: unknown): value is UserAccount[] {
  return Array.isArray(value) && value.every(isUserAccount);
}

function isAuthSession(value: unknown): value is AuthSession {
  return (
    isRecord(value) &&
    typeof value.userId === 'string' &&
    typeof value.name === 'string' &&
    typeof value.email === 'string' &&
    isUserRole(value.role) &&
    typeof value.cep === 'string' &&
    typeof value.loggedInAt === 'string'
  );
}

function buildAdminSeedAccount(): UserAccount {
  return {
    id: ADMIN_ACCOUNT_ID,
    name: 'Coordenação CitizenTech (Admin)',
    email: ADMIN_SEED_EMAIL,
    role: 'admin',
    cep: '01310-100',
    neighborhood: 'Bela Vista',
    city: 'São Paulo',
    state: 'SP',
    passwordHash: hashPasswordLocal(ADMIN_SEED_PASSWORD, ADMIN_SEED_EMAIL),
    createdAt: '2026-03-01T08:00:00.000Z',
  };
}

function toSession(account: UserAccount): AuthSession {
  return {
    userId: account.id,
    name: account.name,
    email: account.email,
    role: account.role,
    cep: account.cep,
    neighborhood: account.neighborhood,
    city: account.city,
    state: account.state,
    contact: account.contact,
    loggedInAt: new Date().toISOString(),
  };
}

/** Garante que a conta de administrador semeada exista na lista de contas. */
export async function getAllAccounts(): Promise<UserAccount[]> {
  const stored = await readStoredJson<UserAccount[]>(ACCOUNTS_KEY, isUserAccountList, []);
  const adminAccount = buildAdminSeedAccount();
  const existingAdminIndex = stored.findIndex(
    (item) => item.id === ADMIN_ACCOUNT_ID || item.email.toLowerCase() === adminAccount.email,
  );

  if (existingAdminIndex === -1) {
    const next = [adminAccount, ...stored];
    await writeStoredJson(ACCOUNTS_KEY, next);
    return next;
  }

  // Sincroniza credenciais caso o .env tenha sido alterado
  const currentAdmin = stored[existingAdminIndex];
  if (
    currentAdmin &&
    (currentAdmin.email !== adminAccount.email ||
      currentAdmin.passwordHash !== adminAccount.passwordHash ||
      currentAdmin.role !== 'admin')
  ) {
    const next = [...stored];
    next[existingAdminIndex] = adminAccount;
    await writeStoredJson(ACCOUNTS_KEY, next);
    return next;
  }

  return stored;
}

/** Lê a sessão ativa persistida (ou null se deslogado). */
export async function getStoredSession(): Promise<AuthSession | null> {
  await getAllAccounts();
  return readStoredJson<AuthSession | null>(
    SESSION_KEY,
    (val): val is AuthSession | null => val === null || isAuthSession(val),
    null,
  );
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

/** Autentica usuário ou administrador por e-mail e senha. */
export async function authenticateUser(input: LoginInput): Promise<AuthSession> {
  const email = input.email.trim().toLowerCase();
  const accounts = await getAllAccounts();
  const account = accounts.find((item) => item.email.toLowerCase() === email);

  if (!account) {
    throw new AuthError('E-mail ou senha incorretos. Confira os dados informados.');
  }

  const candidateHash = hashPasswordLocal(input.password, email);
  if (account.passwordHash !== candidateHash) {
    throw new AuthError('E-mail ou senha incorretos. Confira os dados informados.');
  }

  const session = toSession(account);
  await writeStoredJson(SESSION_KEY, session);
  return session;
}

/**
 * Registra uma nova conta de usuário comum (role = 'user').
 * A tela pública de cadastro NUNCA cria administradores (M5).
 */
export async function registerUserAccount(input: RegisterInput): Promise<AuthSession> {
  const email = input.email.trim().toLowerCase();
  const accounts = await getAllAccounts();

  if (accounts.some((item) => item.email.toLowerCase() === email)) {
    throw new AuthError('Já existe uma conta cadastrada com este e-mail.');
  }

  const newAccount: UserAccount = {
    id: generateId('user'),
    name: input.name.trim(),
    email,
    role: 'user',
    cep: formatCep(input.cep),
    neighborhood: input.neighborhood?.trim() || undefined,
    city: input.city?.trim() || undefined,
    state: input.state?.trim().toUpperCase() || undefined,
    contact: input.contact?.trim() || email,
    passwordHash: hashPasswordLocal(input.password, email),
    createdAt: new Date().toISOString(),
  };

  const next = [...accounts, newAccount];
  await writeStoredJson(ACCOUNTS_KEY, next);

  const session = toSession(newAccount);
  await writeStoredJson(SESSION_KEY, session);
  return session;
}

/** Encerra a sessão atual no AsyncStorage. */
export async function clearStoredSession(): Promise<void> {
  await removeStoredKey(SESSION_KEY);
}
