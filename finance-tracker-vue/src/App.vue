<script setup>
import { ref, computed } from "vue";

import SummaryCards from "./components/SummaryCards.vue";
import TransactionForm from "./components/TransactionForm.vue";
import FiltersBar from "./components/FiltersBar.vue";
import TransactionsTable from "./components/TransactionsTable.vue";

import { useLocalStorage } from "./composables/useLocalStorage";
import { useTransactions } from "./composables/useTransactions";

/* ======================================================
 * 1) Fonte de verdade + composables
 * ====================================================== */
const STORAGE_KEY = "finance-tracker-transactions";
const transactions = useLocalStorage(STORAGE_KEY, []);

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

function handleDelete(id) {
  const confirmed = window.confirm(
    "Tem certeza que deseja excluir esta transação?"
  );
  if (!confirmed) return;

  deleteTx(id);
  showFeedback("Transação removida com sucesso");
}


/* ======================================================
 * 2) Estado de UI (filtros)
 * ====================================================== */
const filterType = ref("all");
const searchText = ref("");
const sortBy = ref("date-desc");

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
    .filter((tx) => tx.type === "income")
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0)
);

const expenseTotal = computed(() =>
  visibleTransactions.value
    .filter((tx) => tx.type === "expense")
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

</script>

<template>
  <div>
    <header class="container">
      <h1>Finance Tracker</h1>
      <p>Controle simples de receitas e despesas</p>
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
