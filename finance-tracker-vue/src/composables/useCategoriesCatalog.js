import { computed } from "vue";
import { useLocalStorage } from "./useLocalStorage";
import { TRANSACTION_TYPES } from "../core/domain/transactionTypes";
import { CATEGORIES as DEFAULT_CATEGORIES } from "../core/domain/categories";

const CATEGORIES_SCHEMA_VERSION = 1;
const STORAGE_KEY = "finance-tracker-categories";

// ======================================================
// Helpers de domínio
// ======================================================
function createCategory(name, color = "#64748b") {
  return {
    name: String(name).trim(),
    color: String(color).trim() || "#64748b",
  };
}

function dedupeAndSortCategories(list) {
  // normaliza e remove vazios
  const cleaned = (Array.isArray(list) ? list : [])
    .map((c) => {
      // aceita legado (string) ou novo (obj)
      if (typeof c === "string") return createCategory(c);
      if (c && typeof c === "object") return createCategory(c.name, c.color);
      return null;
    })
    .filter((c) => c && c.name.length > 0);

  // dedupe por name (case-insensitive)
  const map = new Map();
  for (const c of cleaned) {
    const key = c.name.toLowerCase();
    if (!map.has(key)) map.set(key, c);
  }

  return Array.from(map.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "pt-BR")
  );
}

// ======================================================
// Normalização do catálogo (migração legado -> novo)
// ======================================================
function normalizeCatalog(raw) {
  const defaultIncome = DEFAULT_CATEGORIES[TRANSACTION_TYPES.INCOME].map((n) =>
    createCategory(n)
  );
  const defaultExpense = DEFAULT_CATEGORIES[TRANSACTION_TYPES.EXPENSE].map((n) =>
    createCategory(n)
  );

  // nada salvo
  if (raw == null) {
    return {
      version: CATEGORIES_SCHEMA_VERSION,
      categories: {
        [TRANSACTION_TYPES.INCOME]: defaultIncome,
        [TRANSACTION_TYPES.EXPENSE]: defaultExpense,
      },
    };
  }

  // formato esperado: { version, categories: { income: [...], expense: [...] } }
  if (
    raw &&
    typeof raw === "object" &&
    raw.categories &&
    typeof raw.categories === "object"
  ) {
    const incomeRaw = raw.categories[TRANSACTION_TYPES.INCOME];
    const expenseRaw = raw.categories[TRANSACTION_TYPES.EXPENSE];

    const income =
      Array.isArray(incomeRaw) && incomeRaw.length > 0
        ? dedupeAndSortCategories(incomeRaw)
        : defaultIncome;

    const expense =
      Array.isArray(expenseRaw) && expenseRaw.length > 0
        ? dedupeAndSortCategories(expenseRaw)
        : defaultExpense;

    return {
      version: CATEGORIES_SCHEMA_VERSION,
      categories: {
        [TRANSACTION_TYPES.INCOME]: income,
        [TRANSACTION_TYPES.EXPENSE]: expense,
      },
    };
  }

  // qualquer outro formato: reseta
  return {
    version: CATEGORIES_SCHEMA_VERSION,
    categories: {
      [TRANSACTION_TYPES.INCOME]: defaultIncome,
      [TRANSACTION_TYPES.EXPENSE]: defaultExpense,
    },
  };
}

export function useCategoriesCatalog() {
  const storage = useLocalStorage(STORAGE_KEY, null);
  const normalized = normalizeCatalog(storage.value);

  const needsRewrite =
    storage.value == null ||
    !storage.value.categories ||
    Number(storage.value.version) !== CATEGORIES_SCHEMA_VERSION;

  if (needsRewrite) {
    storage.value = normalized;
  }

  // fonte de verdade do catálogo
  const catalogRef = computed({
    get() {
      return storage.value;
    },
    set(v) {
      storage.value = v;
    },
  });

  const categoriesByType = computed(() => catalogRef.value.categories);

  function addCategory(type, name, color = "#64748b") {
    const list = categoriesByType.value[type] ?? [];
    const newCat = createCategory(name, color);

    // bloqueia duplicados por nome (case-insensitive)
    const exists = list.some((c) => c.name.toLowerCase() === newCat.name.toLowerCase());
    if (exists) return;

    const next = dedupeAndSortCategories([...list, newCat]);

    catalogRef.value = {
      ...catalogRef.value,
      categories: {
        ...catalogRef.value.categories,
        [type]: next,
      },
    };
  }

  function removeCategory(type, name) {
    const list = categoriesByType.value[type] ?? [];
    const next = list.filter((c) => c.name !== name);

    catalogRef.value = {
      ...catalogRef.value,
      categories: {
        ...catalogRef.value.categories,
        [type]: next,
      },
    };
  }

  function renameCategory(type, oldName, newName) {
    const list = categoriesByType.value[type] ?? [];
    const nextName = String(newName).trim();
    if (!nextName) return;

    // bloqueia renomear para duplicado
    const exists = list.some(
      (c) => c.name.toLowerCase() === nextName.toLowerCase() && c.name !== oldName
    );
    if (exists) return;

    const next = dedupeAndSortCategories(
      list.map((c) => (c.name === oldName ? { ...c, name: nextName } : c))
    );

    catalogRef.value = {
      ...catalogRef.value,
      categories: {
        ...catalogRef.value.categories,
        [type]: next,
      },
    };
  }

  return {
    catalogRef,        // { version, categories: { income: [{name,color}], expense: [...] } }
    categoriesByType,  // { income: [{...}], expense: [{...}] }
    addCategory,
    removeCategory,
    renameCategory,
  };
}
