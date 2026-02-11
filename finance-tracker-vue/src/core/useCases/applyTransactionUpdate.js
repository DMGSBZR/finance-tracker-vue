import { normalizeTransactionsList } from "../domain/normalizeTransactions";

/**
 * Aplica uma atualização em uma transação existente e revalida via domínio.
 * - Puro: não acessa Vue, storage, UI.
 * - Retorna um novo array (imutável).
 */
export function applyTransactionUpdate(currentTransactions, updatedTx, categoriesByType) {
  const idx = currentTransactions.findIndex((t) => t.id === updatedTx.id);
  if (idx === -1) return currentTransactions;

  const next = currentTransactions.slice();
  next[idx] = updatedTx;

  return normalizeTransactionsList(next, categoriesByType);
}
