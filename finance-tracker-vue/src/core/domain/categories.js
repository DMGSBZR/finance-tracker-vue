import { TRANSACTION_TYPES } from "./transactionTypes";

export const CATEGORIES = {
  [TRANSACTION_TYPES.INCOME]: [
    "Salário",
    "Freelance",
    "Investimentos",
    "Outros",
  ],
  [TRANSACTION_TYPES.EXPENSE]: [
    "Alimentação",
    "Transporte",
    "Moradia",
    "Lazer",
    "Saúde",
    "Outros",
  ],
};