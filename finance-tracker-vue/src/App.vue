<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from "vue";
import { TRANSACTION_TYPES } from "./domain/transactionTypes";
import { useCategoriesCatalog } from "./composables/useCategoriesCatalog";

import SummaryCards from "./components/SummaryCards.vue";
import TransactionForm from "./components/TransactionForm.vue";
import FiltersBar from "./components/FiltersBar.vue";
import TransactionsTable from "./components/TransactionsTable.vue";

import { useLocalStorage } from "./composables/useLocalStorage";
import { useTransactions } from "./composables/useTransactions";

import {
  normalizeTransactionsList,
  TRANSACTIONS_SCHEMA_VERSION,
} from "./domain/normalizeTransactions";

/* ======================================================
 * 0) Migração/normalização 
 * ====================================================== */
function migrateTransactions(raw, categoriesByType) {
  if (Array.isArray(raw)) {
    const normalized = normalizeTransactionsList(raw, categoriesByType);
    return { version: TRANSACTIONS_SCHEMA_VERSION, transactions: normalized };
  }

  if (raw && typeof raw === "object") {
    const normalized = normalizeTransactionsList(raw.transactions, categoriesByType);
    return { version: TRANSACTIONS_SCHEMA_VERSION, transactions: normalized };
  }

  return { version: TRANSACTIONS_SCHEMA_VERSION, transactions: [] };
}

/* ======================================================
 * 1) Fonte de verdade + persistência versionada
 * ====================================================== */
const STORAGE_KEY = "finance-tracker-transactions";

// storageRaw é APENAS infra (pode vir legado: array / ou novo: {version, transactions})
const storageRaw = useLocalStorage(STORAGE_KEY, null);
const {
  catalogRef,
  categoriesByType,
  addCategory,
  removeCategory,
  renameCategory,
} = useCategoriesCatalog();

// migra/normaliza uma vez ao carregar
const migrated = migrateTransactions(storageRaw.value, categoriesByType.value);

// fonte de verdade do app: SEMPRE um array normalizado
const transactions = ref(migrated.transactions);

// regrava storage somente se necessário (legado/null/versão diferente)
const rawBefore = storageRaw.value;
const needsRewrite =
  Array.isArray(rawBefore) ||
  rawBefore == null ||
  (rawBefore &&
    typeof rawBefore === "object" &&
    Number(rawBefore.version) !== TRANSACTIONS_SCHEMA_VERSION);

if (needsRewrite) {
  storageRaw.value = {
    version: TRANSACTIONS_SCHEMA_VERSION,
    transactions: transactions.value,
  };
}


// mantém persistência reativa no schema novo
watch(
  transactions,
  (list) => {
    storageRaw.value = {
      version: TRANSACTIONS_SCHEMA_VERSION,
      transactions: list,
    };
  },
  { deep: true }
);

/* ======================================================
 * Feedback de UX
 * ====================================================== */
const feedbackMessage = ref("");
const feedbackType = ref("success");

function showFeedback(message, type = "success") {
  feedbackMessage.value = message;
  feedbackType.value = type;

  setTimeout(() => {
    feedbackMessage.value = "";
  }, 3000);
}

/* ======================================================
 * 1.1) Histórico (Undo / Redo) 
 * ====================================================== */
const undoStack = ref([]); // snapshots (arrays de tx)
const redoStack = ref([]);
const HISTORY_LIMIT = 50;

function cloneSnapshot() {
  return JSON.parse(
    JSON.stringify({
      transactions: transactions.value,
      categories: catalogRef.value, // <- o catálogo inteiro (storage)
    })
  );
}

function pushUndo(stateBeforeChange) {
  undoStack.value.push(stateBeforeChange);
  if (undoStack.value.length > HISTORY_LIMIT) undoStack.value.shift();
  redoStack.value = [];
}

const canUndo = computed(() => undoStack.value.length > 0);
const canRedo = computed(() => redoStack.value.length > 0);

function undo() {
  if (!canUndo.value) return;

  const current = cloneSnapshot();
  const previous = undoStack.value.pop();

  redoStack.value.push(current);

  transactions.value = previous.transactions;
  catalogRef.value = previous.categories;

  showFeedback("Desfez a última ação");
}

function redo() {
  if (!canRedo.value) return;

  const current = cloneSnapshot();
  const next = redoStack.value.pop();

  undoStack.value.push(current);

  transactions.value = next.transactions;
  catalogRef.value = next.categories;

  showFeedback("Refez a última ação");
}

function isTypingTarget(el) {
  if (!el) return false;
  const tag = el.tagName?.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    el.isContentEditable
  );
}

function onKeyDown(e) {
  if (!(e.ctrlKey || e.metaKey)) return;
  if (isTypingTarget(e.target)) return;

  const key = e.key.toLowerCase();

  // Ctrl/Cmd+Z (undo)
  if (key === "z" && !e.shiftKey) {
    e.preventDefault();
    undo();
    return;
  }

  // Ctrl/Cmd+Shift+Z (redo) ou Ctrl/Cmd+Y
  if ((key === "z" && e.shiftKey) || key === "y") {
    e.preventDefault();
    redo();
  }
}

onMounted(() => {
  window.addEventListener("keydown", onKeyDown);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeyDown);
});

/* ======================================================
 * 2) Composable de domínio (form + CRUD)
 * ====================================================== */
const {
  form,
  errors,
  editingId,
  submitForm: submitTransaction,
  cancelEdit,
  editTransaction: editTx,
  deleteTransaction: deleteTx,
} = useTransactions(transactions);

/* ======================================================
 * 3) Estado de UI (filtros + animação remoção)
 * ====================================================== */
const filterType = ref("all");
const searchText = ref("");
const sortBy = ref("date-desc");
const removingIds = ref(new Set());

const categoriesPanelOpen = useLocalStorage(
  "finance-tracker:categories-panel-open",
  true
);

function toggleCategoriesPanel() {
  categoriesPanelOpen.value = !categoriesPanelOpen.value;
}

const newCategoryInputRef = ref(null);

watch(categoriesPanelOpen, async (open) => {
  if (!open) return;
  await nextTick();
  newCategoryInputRef.value?.focus();
});


function clearFilters() {
  filterType.value = "all";
  searchText.value = "";
  sortBy.value = "date-desc";
}

const manageType = ref(TRANSACTION_TYPES.EXPENSE);
const newCategoryName = ref("");
const newCategoryColor = ref("#64748b");

const managedList = computed(() => {
  return categoriesByType.value?.[manageType.value] ?? [];
});

function handleAddCategory() {
  const name = newCategoryName.value.trim();

  if (!name) {
    showFeedback("Informe um nome de categoria", "error");
    return;
  }

  const before = cloneSnapshot();

  addCategory(manageType.value, name, newCategoryColor.value);

  // garante consistência de domínio (categoria por tipo)
  transactions.value = normalizeTransactionsList(
    transactions.value,
    categoriesByType.value
  );

  pushUndo(before);

  newCategoryName.value = "";
  newCategoryColor.value = "#64748b";

  showFeedback("Categoria adicionada");
}

function countTransactionsUsingCategory(type, category) {
  return transactions.value.filter(
    (tx) => tx.type === type && tx.category === category
  ).length;
}

function handleRemoveCategory(name) {
  const type = manageType.value;
  const affectedCount = countTransactionsUsingCategory(type, name);

  let message = `Remover a categoria "${name}"?`;

  if (affectedCount > 0) {
    message += `\n\n⚠️ ${affectedCount} transação(ões) usam esta categoria e ficarão sem categoria.`;
  }

  const confirmed = window.confirm(message);
  if (!confirmed) return;

  const before = cloneSnapshot();

  removeCategory(type, name);

  transactions.value = normalizeTransactionsList(
    transactions.value,
    categoriesByType.value
  );

  pushUndo(before);
  showFeedback("Categoria removida");
}

function handleRenameCategory(oldName) {
  const next = window.prompt("Novo nome da categoria:", oldName);
  if (next == null) return;

  const newName = next.trim();
  if (!newName) {
    showFeedback("Nome inválido", "error");
    return;
  }

  const before = cloneSnapshot();

  renameCategory(manageType.value, oldName, newName);

  // atualiza transações que usavam a categoria antiga
  transactions.value = transactions.value.map((tx) => {
    if (tx.type === manageType.value && tx.category === oldName) {
      return { ...tx, category: newName };
    }
    return tx;
  });

  // revalida no final
  transactions.value = normalizeTransactionsList(
    transactions.value,
    categoriesByType.value
  );

  pushUndo(before);
  showFeedback("Categoria renomeada");
}

function handleChangeCategoryColor(cat) {
  const current = cat.color || "#64748b";

  const next = window.prompt(
    "Informe a nova cor (hex, ex: #22c55e):",
    current
  );

  if (next == null) return; // cancelou

  const color = next.trim();

  if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
    showFeedback("Cor inválida. Use o formato #RRGGBB", "error");
    return;
  }

  const before = cloneSnapshot();

  const list = categoriesByType.value[manageType.value];
  const target = list.find((c) => c.name === cat.name);
  if (!target) return;
    target.color = color;
  

  pushUndo(before);
  showFeedback("Cor da categoria atualizada");
}

/* ======================================================
 * 4) Handlers de UI (com feedback + histórico)
 * ====================================================== */
function handleSubmit() {
  const wasEditing = !!editingId.value;
    const before = cloneSnapshot();

    submitTransaction();

    if (Object.keys(errors.value).length === 0) {
      pushUndo(before);
    }
    showFeedback(
      wasEditing
        ? "Transação atualizada com sucesso"
        : "Transação adicionada com sucesso"
    );
  }


function handleEdit(tx) {
  editTx(tx);
}

async function handleDelete(id) {
  const confirmed = window.confirm(
    "Tem certeza que deseja excluir esta transação?"
  );
  if (!confirmed) return;

  removingIds.value.add(id);
  await new Promise((resolve) => setTimeout(resolve, 160));

  const before = cloneSnapshot();

  deleteTx(id);

  pushUndo(before);

  removingIds.value.delete(id);
  showFeedback("Transação removida com sucesso");
}

function handleUpdateTransaction(updatedTx) {
  const before = cloneSnapshot();

  const idx = transactions.value.findIndex((t) => t.id === updatedTx.id);
  if (idx === -1) return;

  // aplica mudança
  transactions.value[idx] = updatedTx;

  // domínio soberano: revalida tudo
  transactions.value = normalizeTransactionsList(
    transactions.value,
    categoriesByType.value
  );

  pushUndo(before);
  showFeedback("Categoria atualizada com sucesso");
}

/* ======================================================
 * 5) Derivados (lista visível + categorias)
 * ====================================================== */
const visibleTransactions = computed(() => {
  let list = [...transactions.value];

  if (filterType.value !== "all") {
    list = list.filter((tx) => tx.type === filterType.value);
  }

  const query = searchText.value.trim().toLowerCase();
  if (query) {
    list = list.filter(
      (tx) =>
        tx.category.toLowerCase().includes(query) ||
        (tx.description || "").toLowerCase().includes(query)
    );
  }

  switch (sortBy.value) {
    case "date-asc":
      list.sort((a, b) => a.date.localeCompare(b.date));
      break;
    case "date-desc":
      list.sort((a, b) => b.date.localeCompare(a.date));
      break;
    case "amount-asc":
      list.sort((a, b) => a.amount - b.amount);
      break;
    case "amount-desc":
      list.sort((a, b) => b.amount - a.amount);
      break;
  }

  return list;
});

const availableCategories = computed(() => {
  if (!form.value.type) return [];
  const list = categoriesByType.value?.[form.value.type] ?? [];
  return list.map((c) => c.name);
});

/* ======================================================
 * 6) Resumo financeiro
 * ====================================================== */
function formatBrl(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

const incomeTotal = computed(() =>
  visibleTransactions.value
    .filter((tx) => tx.type === TRANSACTION_TYPES.INCOME)
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0)
);

const expenseTotal = computed(() =>
  visibleTransactions.value
    .filter((tx) => tx.type === TRANSACTION_TYPES.EXPENSE)
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0)
);

const balanceTotal = computed(() => incomeTotal.value - expenseTotal.value);

/* ======================================================
 * 7) Estados derivados de UI
 * ====================================================== */
const hasTransactions = computed(() => transactions.value.length > 0);
const hasVisibleTransactions = computed(() => visibleTransactions.value.length > 0);

const hasActiveFilters = computed(() => {
  return (
    filterType.value !== "all" ||
    searchText.value.trim() !== "" ||
    sortBy.value !== "date-desc"
  );
});

/* ======================================================
 * 8) Backup: Export / Import + histórico
 * ====================================================== */
const importInputRef = ref(null);

function exportBackup() {
  try {
    const payload = {
      version: TRANSACTIONS_SCHEMA_VERSION,
      transactions: transactions.value,
      exportedAt: new Date().toISOString(),
    };

    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;

    const dateTag = new Date().toISOString().slice(0, 10);
    a.download = `finance-tracker-backup-${dateTag}.json`;

    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);

    showFeedback("Backup exportado com sucesso");
  } catch (e) {
    console.error(e);
    showFeedback("Falha ao exportar backup", "error");
  }
}

function triggerImport() {
  importInputRef.value?.click();
}

async function handleImportFileChange(event) {
  const file = event.target.files?.[0];
  event.target.value = ""; // permite importar o mesmo arquivo de novo

  if (!file) return;

  if (
    file.type &&
    file.type !== "application/json" &&
    !file.name.toLowerCase().endsWith(".json")
  ) {
    showFeedback("Arquivo inválido. Selecione um .json", "error");
    return;
  }

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    // Aceita 2 formatos:
    // A) Novo: { version, transactions }
    // B) Legado: [ ...transactions ]
    let rawList = null;

    if (Array.isArray(data)) {
      rawList = data;
    } else if (data && typeof data === "object" && Array.isArray(data.transactions)) {
      rawList = data.transactions;
    } else {
      showFeedback("Estrutura inválida no JSON de backup", "error");
      return;
    }

    const normalized = normalizeTransactionsList(rawList, categoriesByType.value);

    const before = cloneSnapshot();

    transactions.value = normalized;
    pushUndo(before);

    clearFilters();
    showFeedback("Backup importado com sucesso");
  } catch (e) {
    console.error(e);
    showFeedback("Falha ao importar: JSON inválido", "error");
  }
}

const categoryColorMap = computed(() => {
  const map = {
    income: {},
    expense: {},
  };

  const cat = categoriesByType.value ?? {};
  for (const type of Object.keys(map)) {
    const list = Array.isArray(cat[type]) ? cat[type] : [];
    for (const item of list) {
      if (!item?.name) continue;
      map[type][item.name] = item.color || "#64748b";
    }
  }

  return map;
});

function getCategoryColor(type, categoryName) {
  if (!type || !categoryName) return "transparent";
  return categoryColorMap.value?.[type]?.[categoryName] ?? "#64748b";
}
function startFirstTransaction() {
  if (!form.value.type) {
    form.value.type = TRANSACTION_TYPES.EXPENSE;
  }

  nextTick(() => {
    const el = document.querySelector("form select, form input");
    el?.focus();
  });
}

</script>

<template>
  <div>
    <header class="container">
      <div class="header-row">
        <div>
          <h1>Finance Tracker</h1>
          <p>Controle simples de receitas e despesas</p>
        </div>

        <div class="header-actions">
          <button
            type="button"
            @click="undo"
            :disabled="!canUndo"
            :aria-disabled="!canUndo"
            title="Desfazer (Ctrl/Cmd+Z)"
          >
            Desfazer
          </button>

          <button
            type="button"
            @click="redo"
            :disabled="!canRedo"
            :aria-disabled="!canRedo"
            title="Refazer (Ctrl/Cmd+Shift+Z ou Ctrl/Cmd+Y)"
          >
            Refazer
          </button>

          <button type="button" @click="exportBackup">Exportar</button>
          <button type="button" @click="triggerImport">Importar</button>

          <input
            ref="importInputRef"
            type="file"
            accept="application/json,.json"
            class="sr-only"
            @change="handleImportFileChange"
          />
        </div>
      </div>
    </header>

    <main class="container">
      <div
        v-if="feedbackMessage"
        class="feedback"
        :class="`feedback--${feedbackType}`"
        role="status"
        aria-live="polite"
        aria-atomic="true"

      >
        {{ feedbackMessage }}
      </div>

      <div class="app-shell">
        <!-- Coluna esquerda: criação/edição -->
        <section class="panel">
          <h2>Nova transação</h2>

          <TransactionForm
            v-model="form"
            :errors="errors"
            :is-editing="!!editingId"
            :categories="availableCategories"
            :get-category-color="getCategoryColor"
            @submit="handleSubmit"
            @cancel="cancelEdit"
          />
        </section>

        <!-- Coluna direita: resumo + filtros + lista -->
        <section class="panel">
          <SummaryCards
            :income-total="incomeTotal"
            :expense-total="expenseTotal"
            :balance-total="balanceTotal"
            :format-brl="formatBrl"
          />

          <FiltersBar
            v-model:filterType="filterType"
            v-model:searchText="searchText"
            v-model:sortBy="sortBy"
            :has-active-filters="hasActiveFilters"
            @clear="clearFilters"
          />

<div class="panel-divider"></div>

<section class="categories-manager" aria-label="Gerenciar categorias">
  <button
  class="categories-toggle"
  type="button"
  @click="toggleCategoriesPanel"
  :aria-expanded="categoriesPanelOpen"
  aria-controls="categories-panel"
>
    <span>Gerenciar categorias</span>
    <span aria-hidden="true">
      {{ categoriesPanelOpen ? "▲" : "▼" }}
    </span>
  </button>

  <div id="categories-panel" v-show="categoriesPanelOpen">
    <div class="field">
      <label for="manageType">Tipo</label>
      <select id="manageType" v-model="manageType">
        <option :value="TRANSACTION_TYPES.INCOME">Receita</option>
        <option :value="TRANSACTION_TYPES.EXPENSE">Despesa</option>
      </select>
    </div>

    <div class="field">
      <label for="newCategory">Nova categoria</label>

      <div class="row">
  <input
  ref="newCategoryInputRef"
  id="newCategory"
  type="text"
  v-model="newCategoryName"
  placeholder="Ex: Transporte"
/>

  <input
    type="color"
    v-model="newCategoryColor"
    aria-label="Cor da categoria"
    title="Cor da categoria"
  />

  <button type="button" @click="handleAddCategory">Adicionar</button>
</div>
    </div>

    <div
      v-if="managedList.length === 0"
      class="ui-state"
      role="status"
      aria-live="polite"
    >
      Nenhuma categoria cadastrada para este tipo.
    </div>

    <ul v-else class="categories-list">
  <li v-for="cat in managedList" :key="cat.name" class="categories-item">
    <span class="category-badge">
      <span
        class="category-dot"
        :style="{ backgroundColor: cat.color || '#64748b' }"
        aria-hidden="true"
      ></span>

      <span>{{ cat.name }}</span>
    </span>

    <div class="actions">
  <button type="button" @click="handleRenameCategory(cat.name)">
    Renomear
  </button>

  <button type="button" @click="handleChangeCategoryColor(cat)">
    Cor
  </button>

  <button type="button" @click="handleRemoveCategory(cat.name)">
    Remover
  </button>
</div>
  </li>
</ul>
  </div>
</section>

          <div class="panel-divider"></div>

          <h2 class="panel-title">Transações</h2>

          <div
  v-if="!hasTransactions"
  class="ui-state"
  role="status"
  aria-live="polite"
>
  <p class="ui-state__title">Nenhuma transação cadastrada</p>

  <p class="ui-state__text">
    Você ainda não adicionou receitas ou despesas.
  </p>

  <div class="ui-state__actions">
    <button
      type="button"
      class="btn btn-primary"
      @click="startFirstTransaction"
    >
      Adicionar primeira transação
    </button>
  </div>
</div>
          <div
  v-else-if="!hasVisibleTransactions"
  class="ui-state"
  role="status"
  aria-live="polite"
>
  <p class="ui-state__title">Nenhum resultado encontrado</p>

  <p class="ui-state__text">
    Os filtros ou a busca atuais não retornaram nenhuma transação.
  </p>

  <div class="ui-state__actions">
    <button
      type="button"
      class="btn btn-secondary"
      @click="clearFilters"
    >
      Limpar filtros
    </button>
  </div>
</div>

          <div v-else class="table-wrap">
            <TransactionsTable
  :items="visibleTransactions"
  :removing-ids="removingIds"
  :get-category-color="getCategoryColor"
  :categories-by-type="categoriesByType"
  @edit="handleEdit"
  @delete="handleDelete"
  @update="handleUpdateTransaction"
/>
          </div>
        </section>
      </div>
    </main>

    <footer class="container">
      <p>Finance Tracker — projeto de estudo</p>
    </footer>
  </div>
</template>
