// src/domain/normalizeTransactions.js
import { TRANSACTION_TYPES } from "./transactionTypes";
import { CATEGORIES } from "./categories";

/**
 * Heurística simples para detectar/forçar um tipo válido.
 * Aceita variações comuns de legado: "income", "expense", case-insensitive.
 */
function normalizeType(rawType) {
  if (!rawType) return TRANSACTION_TYPES.EXPENSE;

  const t = String(rawType).toUpperCase();

  const income = String(TRANSACTION_TYPES.INCOME).toUpperCase();   // "INCOME" se fosse, mas no seu caso vira "INCOME"? -> na real vira "INCOME" só após toUpperCase
const expense = String(TRANSACTION_TYPES.EXPENSE).toUpperCase(); // idem

if (t === income) return TRANSACTION_TYPES.INCOME;
if (t === expense) return TRANSACTION_TYPES.EXPENSE;

// Aceita legado explícito também
if (t === "INCOME") return TRANSACTION_TYPES.INCOME;
if (t === "EXPENSE") return TRANSACTION_TYPES.EXPENSE;

  // fallback seguro
  return TRANSACTION_TYPES.EXPENSE;
}

/**
 * Garante categoria coerente com o tipo.
 * Se inválida, retorna "" (para forçar o usuário escolher) ou uma default.
 * Aqui vamos retornar "" para não mascarar dado errado.
 */
function normalizeCategory(type, rawCategory) {
  const allowed = CATEGORIES[type] ?? [];
  if (!rawCategory) return "";
  return allowed.includes(rawCategory) ? rawCategory : "";
}

function normalizeAmount(rawAmount) {
  // aceita "12,50", "12.50", 12.5 etc
  if (rawAmount === null || rawAmount === undefined || rawAmount === "") return 0;

  const normalized = String(rawAmount).replace(",", ".");
  const n = Number(normalized);

  return Number.isFinite(n) ? n : 0;
}

function normalizeDate(rawDate) {
  // esperamos "YYYY-MM-DD" (input type="date")
  if (!rawDate) return new Date().toISOString().slice(0, 10);

  const s = String(rawDate);

  // se já parece YYYY-MM-DD, mantém
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // tenta parsear datas antigas
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);

  return new Date().toISOString().slice(0, 10);
}

function normalizeDescription(raw) {
  if (!raw) return "";
  return String(raw).trim();
}

/**
 * Não use libs aqui. Queremos determinismo e baixo acoplamento.
 */
function ensureId(rawId) {
  if (rawId && String(rawId).trim()) return String(rawId);
  // id simples suficiente para local app
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeOne(raw) {
  const type = normalizeType(raw?.type);

  return {
    id: ensureId(raw?.id),
    type,
    category: normalizeCategory(type, raw?.category),
    amount: normalizeAmount(raw?.amount),
    date: normalizeDate(raw?.date),
    description: normalizeDescription(raw?.description),
  };
}

/**
 * Normaliza uma lista inteira.
 * - Remove itens inválidos (não-objeto)
 * - Normaliza campos
 */
export function normalizeTransactionsList(rawList) {
  if (!Array.isArray(rawList)) return [];

  return rawList
    .filter((x) => x && typeof x === "object")
    .map(normalizeOne);
}

/**
 * Uma “assinatura” simples de schema.
 * Usamos para marcar dados já migrados.
 */
export const TRANSACTIONS_SCHEMA_VERSION = 1;