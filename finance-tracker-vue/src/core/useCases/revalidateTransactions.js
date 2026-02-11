import { normalizeTransactionsList } from "../domain/normalizeTransactions";

/**
 * Revalida transações após mudanças no catálogo.
 * Domínio soberano: corrige categorias inválidas automaticamente.
 */
export function revalidateTransactions(currentTransactions, categoriesByType) {
  return normalizeTransactionsList(currentTransactions, categoriesByType);
}
