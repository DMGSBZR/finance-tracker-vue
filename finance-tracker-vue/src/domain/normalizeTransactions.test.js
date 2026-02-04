import { describe, it, expect } from "vitest";
import { normalizeTransactionsList } from "./normalizeTransactions";
import { TRANSACTION_TYPES } from "./transactionTypes";
import { CATEGORIES } from "./categories";

describe("normalizeTransactionsList", () => {
  it("returns [] when input is not an array", () => {
    expect(normalizeTransactionsList(null)).toEqual([]);
    expect(normalizeTransactionsList(undefined)).toEqual([]);
    expect(normalizeTransactionsList({})).toEqual([]);
  });

  it("filters invalid items and ensures id exists", () => {
    const out = normalizeTransactionsList([
      null,
      123,
      "x",
      { type: "income" },
    ]);

    expect(out.length).toBe(1);
    expect(out[0]).toHaveProperty("id");
  });

  it("normalizes type case-insensitively", () => {
    const out = normalizeTransactionsList([
      { type: "INCOME" },
      { type: "income" },
      { type: "Expense" },
      { type: "EXPENSE" },
    ]);

    expect(out[0].type).toBe(TRANSACTION_TYPES.INCOME);
    expect(out[1].type).toBe(TRANSACTION_TYPES.INCOME);
    expect(out[2].type).toBe(TRANSACTION_TYPES.EXPENSE);
    expect(out[3].type).toBe(TRANSACTION_TYPES.EXPENSE);
  });

  it("falls back to EXPENSE for invalid type", () => {
    const out = normalizeTransactionsList([{ type: "???" }]);
    expect(out[0].type).toBe(TRANSACTION_TYPES.EXPENSE);
  });

  it("normalizes amount correctly", () => {
    const out = normalizeTransactionsList([
      { type: "income", amount: "10,50" },
      { type: "income", amount: "20.25" },
      { type: "income", amount: "abc" },
      { type: "income", amount: "" },
    ]);

    expect(out[0].amount).toBe(10.5);
    expect(out[1].amount).toBe(20.25);
    expect(out[2].amount).toBe(0);
    expect(out[3].amount).toBe(0);
  });

  it("keeps category only if valid for the type", () => {
    const validIncomeCategory = CATEGORIES[TRANSACTION_TYPES.INCOME][0];
    const validExpenseCategory = CATEGORIES[TRANSACTION_TYPES.EXPENSE][0];

    const out = normalizeTransactionsList([
      { type: "income", category: validIncomeCategory },
      { type: "expense", category: validExpenseCategory },
      { type: "income", category: validExpenseCategory },
    ]);

    expect(out[0].category).toBe(validIncomeCategory);
    expect(out[1].category).toBe(validExpenseCategory);
    expect(out[2].category).toBe("");
  });

  it("normalizes date safely", () => {
    const out = normalizeTransactionsList([
      { type: "income", date: "2026-02-01" },
      { type: "income", date: "01/20/2026" },
      { type: "income", date: "invalid-date" },
    ]);

    expect(out[0].date).toBe("2026-02-01");
    expect(out[1].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(out[2].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("trims description", () => {
    const out = normalizeTransactionsList([
      { type: "income", description: "  teste  " },
    ]);

    expect(out[0].description).toBe("teste");
  });
});