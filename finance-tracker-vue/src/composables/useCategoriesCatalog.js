import { computed } from "vue";
import { useLocalStorage } from "./useLocalStorage";
import { TRANSACTION_TYPES } from "../domain/transactionTypes";
import { CATEGORIES as DEFAULT_CATEGORIES } from "../domain/categories";

const CATEGORIES_SCHEMA_VERSION = 1;
const STORAGE_KEY = "finance-tracker-categories";

function normalizeCatalog(raw) {
  // legado: nada salvo
  if (raw == null) {
    return {
      version: CATEGORIES_SCHEMA_VERSION,
      categories: {
        [TRANSACTION_TYPES.INCOME]: [...DEFAULT_CATEGORIES[TRANSACTION_TYPES.INCOME]],
        [TRANSACTION_TYPES.EXPENSE]: [...DEFAULT_CATEGORIES[TRANSACTION_TYPES.EXPENSE]],
      },
    };
  }

  // formato novo esperado
  if (raw && typeof raw === "object" && raw.categories && typeof raw.categories === "object") {
    const income = Array.isArray(raw.categories[TRANSACTION_TYPES.INCOME])
      ? raw.categories[TRANSACTION_TYPES.INCOME].map(String)
      : [...DEFAULT_CATEGORIES[TRANSACTION_TYPES.INCOME]];

    const expense = Array.isArray(raw.categories[TRANSACTION_TYPES.EXPENSE])
      ? raw.categories[TRANSACTION_TYPES.EXPENSE].map(String)
      : [...DEFAULT_CATEGORIES[TRANSACTION_TYPES.EXPENSE]];

    return {
      version: CATEGORIES_SCHEMA_VERSION,
      categories: {
        [TRANSACTION_TYPES.INCOME]: income,
        [TRANSACTION_TYPES.EXPENSE]: expense,
      },
    };
  }

  // formato legado estranho: reseta com defaults
  return {
    version: CATEGORIES_SCHEMA_VERSION,
    categories: {
      [TRANSACTION_TYPES.INCOME]: [...DEFAULT_CATEGORIES[TRANSACTION_TYPES.INCOME]],
      [TRANSACTION_TYPES.EXPENSE]: [...DEFAULT_CATEGORIES[TRANSACTION_TYPES.EXPENSE]],
    },
  };
}

function dedupeAndSort(list) {
  const cleaned = list
    .map((x) => String(x).trim())
    .filter((x) => x.length > 0);

  return Array.from(new Set(cleaned)).sort((a, b) => a.localeCompare(b));
}

export function useCategoriesCatalog() {
  const storage = useLocalStorage(STORAGE_KEY, null);
  const normalized = normalizeCatalog(storage.value);

  // regrava se necessário
  const needsRewrite =
    storage.value == null ||
    !storage.value.categories ||
    Number(storage.value.version) !== CATEGORIES_SCHEMA_VERSION;

  if (needsRewrite) {
    storage.value = normalized;
  }

  const categoriesByType = computed(() => storage.value.categories);

  function addCategory(type, name) {
    const current = storage.value.categories?.[type] ?? [];
    const next = dedupeAndSort([...current, name]);
    storage.value = {
      ...storage.value,
      categories: { ...storage.value.categories, [type]: next },
    };
  }

  function removeCategory(type, name) {
    const current = storage.value.categories?.[type] ?? [];
    const next = current.filter((c) => c !== name);
    storage.value = {
      ...storage.value,
      categories: { ...storage.value.categories, [type]: next },
    };
  }

  function renameCategory(type, oldName, newName) {
    const current = storage.value.categories?.[type] ?? [];
    const replaced = current.map((c) => (c === oldName ? newName : c));
    const next = dedupeAndSort(replaced);
    storage.value = {
      ...storage.value,
      categories: { ...storage.value.categories, [type]: next },
    };
  }

  return {
    catalogRef: storage,
    categoriesByType,
    addCategory,
    removeCategory,
    renameCategory,
  };
}