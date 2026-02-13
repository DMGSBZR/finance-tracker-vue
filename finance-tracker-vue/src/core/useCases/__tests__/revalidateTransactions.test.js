import { describe, it, expect } from "vitest";
import { revalidateTransactions } from "../revalidateTransactions";

describe("revalidateTransactions", () => {
  it("revalida a lista inteira via domínio (categorias inválidas viram vazias)", () => {
    const categoriesByType = {
      income: [{ name: "Salário", color: "#000000" }],
      expense: [{ name: "Alimentação", color: "#000000" }],
    };

    const current = [
      {
        id: "1",
        type: "expense",
        category: "Inexistente",
        amount: 10,
        date: "2026-01-01",
        description: "A",
      },
      {
        id: "2",
        type: "income",
        category: "Salário",
        amount: 100,
        date: "2026-01-02",
        description: "B",
      },
    ];

    const result = revalidateTransactions(current, categoriesByType);

    // domínio soberano: inválida vira ""
    expect(result[0].category).toBe("");

    // válida permanece
    expect(result[1].category).toBe("Salário");
  });

  it("normaliza campos de todos os itens (amount e date)", () => {
    const categoriesByType = {
      income: [{ name: "Salário", color: "#000000" }],
      expense: [{ name: "Alimentação", color: "#000000" }],
    };

    const current = [
      {
        id: "1",
        type: "expense",
        category: "Alimentação",
        amount: "12,50",
        date: "2026-01-03",
        description: "A",
      },
      {
        id: "2",
        type: "income",
        category: "Salário",
        amount: "",
        date: "",
        description: "B",
      },
    ];

    const result = revalidateTransactions(current, categoriesByType);

    // "12,50" -> 12.5
    expect(result[0].amount).toBe(12.5);

    // "" -> 0
    expect(result[1].amount).toBe(0);

    // date vazio vira uma data válida YYYY-MM-DD
    expect(result[1].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("retorna array vazio se entrada não for array", () => {
    const categoriesByType = {
      income: [],
      expense: [],
    };

    const result = revalidateTransactions(null, categoriesByType);

    // normalizeTransactionsList retorna []
    expect(result).toEqual([]);
  });
});
