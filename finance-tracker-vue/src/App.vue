<script setup>

import { ref, computed} from 'vue';
import SummaryCards from './components/SummaryCards.vue';
import FiltersBar from './components/FiltersBar.vue';
import TransactionsTable from './components/TransactionsTable.vue';
import TransactionForm from './components/TransactionForm.vue';
import { useLocalStorage } from './composables/useLocalStorage.js';
import {useTransactions } from './composables/useTransactions.js';

const STORAGE_KEY = 'finance-tracker-transactions';
const transactions = useLocalStorage(STORAGE_KEY, []);

const filterType = ref("all");
const searchText = ref("");
const sortBy = ref("date-desc");

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

// =====================
// Resumo financeiro
// =====================


// Formatação de moeda BRL
function formatBrl(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

const incomeTotal = computed(() => {
  return visibleTransactions.value
    .filter((tx) => tx.type === "income")
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
});

const expenseTotal = computed(() => {
  return visibleTransactions.value
    .filter((tx) => tx.type === "expense")
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
});

const balanceTotal = computed(() => incomeTotal.value - expenseTotal.value);


// =====================
// Estados de UI
// =====================
const hasTransactions = computed(() => transactions.value.length > 0);
const hasVisibleTransactions = computed(() => visibleTransactions.value.length > 0);

// =====================
// Filtros ativos
// =====================
const hasActiveFilters = computed(() => {
  return (
    filterType.value !== "all" ||
    searchText.value.trim() !== "" ||
    sortBy.value !== "date-desc"
  );
});

function clearFilters() {
  filterType.value = "all";
  searchText.value = "";
  sortBy.value = "date-desc";
}

const { form, errors, editingId, submitForm, cancelEdit, editTransaction, deleteTransaction } = useTransactions(transactions);

</script>

<template>
  <div>
    <header class="container">
      <h1>Finance Tracker</h1>
      <p>Controle simples de receitas e despesas</p>
    </header>

    <main class="container">

      <SummaryCards
  :income-total="incomeTotal"
  :expense-total="expenseTotal"
  :balance-total="balanceTotal"
  :format-brl="formatBrl"
/>

      <TransactionForm
  v-model="form"
  :errors="errors"
  :is-editing="!!editingId"
  @submit="submitForm"
  @cancel="cancelEdit"
/>

     <FiltersBar
  v-model:filterType="filterType"
  v-model:searchText="searchText"
  v-model:sortBy="sortBy"
  :has-active-filters="hasActiveFilters"
  @clear="clearFilters"
/>
      <section>
  <h2>Transações</h2>

  <!-- 1) Sem nenhuma transação cadastrada -->
  <div v-if="!hasTransactions" class="ui-state" role="status" aria-live="polite">
    Nenhuma transação cadastrada. Adicione sua primeira receita ou despesa.
  </div>

  <!-- 2) Tem transações, mas não tem resultados visíveis -->
  <div v-else-if="!hasVisibleTransactions" class="ui-state" role="status" aria-live="polite">
    Nenhum resultado encontrado com os filtros/busca atuais.
  </div>

  <!-- 3) Tabela normal -->
  <div v-else>
  <TransactionsTable
    :items="visibleTransactions"
    @edit="editTransaction"
    @delete="deleteTransaction"
  />
</div>
</section>
    </main>

    <footer class="container">
      <p>Finance Tracker — projeto de estudo</p>
    </footer>
  </div>
</template>
