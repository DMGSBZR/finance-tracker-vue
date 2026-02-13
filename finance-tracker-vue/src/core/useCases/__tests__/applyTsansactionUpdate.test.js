import { describe, it, expect } from "vitest";
import { applyTransactionUpdate } from "../applyTransactionUpdate";

describe("applyTransactionUpdate", () => {
  it("retorna o mesmo array se o id não existir", () => {
    const categoriesByType = {
      income: [{ name: "Salário", color: "#000000" }],
      expense: [{ name: "Alimentação", color: "#000000" }],
    };

    const current = [
      {
        id: "1",
        type: "expense",
        category: "Alimentação",
        amount: 10,
        date: "2026-01-01",
        description: "A",
      },
    ];

    const updated = { ...current[0], id: "999", category: "Alimentação" };

    const result = applyTransactionUpdate(current, updated, categoriesByType);

    // comportamento: se não achou id, não mexe
    expect(result).toBe(current);
  });

  it("aplica update e revalida via domínio (categoria inválida vira vazia)", () => {
    const categoriesByType = {
      income: [{ name: "Salário", color: "#000000" }],
      expense: [{ name: "Alimentação", color: "#000000" }],
    };

    const current = [
      {
        id: "1",
        type: "expense",
        category: "Alimentação",
        amount: 10,
        date: "2026-01-01",
        description: "A",
      },
    ];

    // tenta setar uma categoria que NÃO existe no catálogo
    const updated = { ...current[0], category: "Inexistente" };

    const result = applyTransactionUpdate(current, updated, categoriesByType);

    // deve ser um novo array
    expect(result).not.toBe(current);

    // domínio soberano: categoria inválida corrigida para ""
    expect(result[0].category).toBe("");
  });

  it("mantém campos normalizados pelo domínio (amount inválido vira 0)", () => {
    const categoriesByType = {
      income: [{ name: "Salário", color: "#000000" }],
      expense: [{ name: "Alimentação", color: "#000000" }],
    };

    const current = [
      {
        id: "1",
        type: "expense",
        category: "Alimentação",
        amount: 10,
        date: "2026-01-01",
        description: "A",
      },
    ];

    // amount inválido (string não numérica) deve virar 0 no normalize
    const updated = { ...current[0], amount: "abc" };

    const result = applyTransactionUpdate(current, updated, categoriesByType);

    expect(result[0].amount).toBe(0);
  });
});
