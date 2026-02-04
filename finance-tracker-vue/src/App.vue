<script setup>
import { ref, computed, watch } from "vue";
import { TRANSACTION_TYPES } from "./domain/transactionTypes";
import { CATEGORIES } from "./domain/categories";

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

function migrateTransactions(raw) {
  // legado: array direto
  if (Array.isArray(raw)) {
    const normalized = normalizeTransactionsList(raw);

    return {
      version: TRANSACTIONS_SCHEMA_VERSION,
      transactions: normalized,
    };
  }

  // formato novo
  if (raw && typeof raw === "object") {
    const normalized = normalizeTransactionsList(raw.transactions);

    return {
      version: TRANSACTIONS_SCHEMA_VERSION,
      transactions: normalized,
    };
  }

  // nada salvo
  return {
    version: TRANSACTIONS_SCHEMA_VERSION,
    transactions: [],
  };
}

/* ======================================================
 * 1) Fonte de verdade + composables
 * ====================================================== */

const STORAGE_KEY = "finance-tracker-transactions";

/**
 * storageRaw é APENAS infra (pode vir legado: array / ou novo: {version, transactions})
 * default null para conseguirmos distinguir "não existe" vs "array vazio".
 */
const storageRaw = useLocalStorage(STORAGE_KEY, null);

/**
 * Migra/normaliza uma vez ao carregar.
 * migrated = { version, transactions }
 */
const migrated = migrateTransactions(storageRaw.value);

/**
 * Fonte de verdade do app: SEMPRE um array normalizado.
 */
const transactions = ref(migrated.transactions);

/**
 * Persistimos imediatamente já no schema novo (versionado),
 * para não precisar migrar toda vez.
 */
const rawBefore = storageRaw.value;
const needsRewrite =
  Array.isArray(rawBefore) ||
  rawBefore == null ||
  (rawBefore && typeof rawBefore === "object" &&
    Number(rawBefore.version) !== TRANSACTIONS_SCHEMA_VERSION);

if (needsRewrite) {
  storageRaw.value = {
    version: TRANSACTIONS_SCHEMA_VERSION,
    transactions: transactions.value,
  };
}

/**
 * Mantém persistência reativa no schema novo.
 */

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
 * Handlers de UI (com feedback)
 * ====================================================== */
function handleSubmit() {
  const wasEditing = !!editingId.value;

  submitTransaction();

  if (Object.keys(errors.value).length === 0) {
    showFeedback(
      wasEditing
        ? "Transação atualizada com sucesso"
        : "Transação adicionada com sucesso"
    );
  }
}

function handleEdit(tx) {
  editTx(tx);
}

async function handleDelete(id) {
  const confirmed = window.confirm(
    "Tem certeza que deseja excluir esta transação?"
  );
  if (!confirmed) return;

  // Marca como removendo (ativa animação CSS)
  removingIds.value.add(id);

  // Espera a animação (0.15s = seu CSS)
  await new Promise((resolve) => setTimeout(resolve, 160));

  // Remove de fato
  deleteTx(id);

  // Limpa estado
  removingIds.value.delete(id);

  showFeedback("Transação removida com sucesso");
}


/* ======================================================
 * 2) Estado de UI (filtros)
 * ====================================================== */
const filterType = ref("all");
const searchText = ref("");
const sortBy = ref("date-desc");
const removingIds = ref(new Set());

/* ======================================================
 * 3) Derivados (lista visível)
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

/* Categorias disponíveis (para o formulário) */
const availableCategories = computed(() => {
  if (!form.value.type) return [];
  return CATEGORIES[form.value.type] ?? [];
});

/* ======================================================
 * 4) Helpers de UI + resumo financeiro
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

const balanceTotal = computed(
  () => incomeTotal.value - expenseTotal.value
);

/* ======================================================
 * 5) Estados derivados de UI
 * ====================================================== */
const hasTransactions = computed(() => transactions.value.length > 0);
const hasVisibleTransactions = computed(
  () => visibleTransactions.value.length > 0
);

const hasActiveFilters = computed(() => {
  return (
    filterType.value !== "all" ||
    searchText.value.trim() !== "" ||
    sortBy.value !== "date-desc"
  );
});

/* ======================================================
 * 6) Actions de UI
 * ====================================================== */
function clearFilters() {
  filterType.value = "all";
  searchText.value = "";
  sortBy.value = "date-desc";
}

/* ======================================================
 * 7) Backup: Export / Import (Aula 12)
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
  // permite importar o mesmo arquivo de novo
  event.target.value = "";

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

    // Domínio manda: normaliza SEMPRE
    const normalized = normalizeTransactionsList(rawList);

    // Substitui a fonte de verdade
    transactions.value = normalized;

    // Opcional: limpa filtros pra evitar “sumir” itens após importar
    clearFilters();

    showFeedback("Backup importado com sucesso");
  } catch (e) {
    console.error(e);
    showFeedback("Falha ao importar: JSON inválido", "error");
  }
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
      <button type="button" @click="exportBackup">Exportar</button>
      <button type="button" @click="triggerImport">Importar</button>

      <!-- input escondido para selecionar o arquivo -->
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

      <h2 class="panel-title">Transações</h2>

      <div
        v-if="!hasTransactions"
        class="ui-state"
        role="status"
        aria-live="polite"
      >
        Nenhuma transação cadastrada. Adicione sua primeira receita ou despesa.
      </div>

      <div
        v-else-if="!hasVisibleTransactions"
        class="ui-state"
        role="status"
        aria-live="polite"
      >
        Nenhum resultado encontrado com os filtros/busca atuais.
      </div>

      <div v-else class="table-wrap">
        <TransactionsTable
  :items="visibleTransactions"
  :removing-ids="removingIds"
  @edit="handleEdit"
  @delete="handleDelete"
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
