<script setup>
import { ref, watch, computed } from 'vue';

const STORAGE_KEY = 'finance-tracker-transactions';
const transactions = ref([]);

function loadTransactions() {
 const raw = localStorage.getItem(STORAGE_KEY);
 if (!raw) return [];

 try { 
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
 }catch {
    return [];
 }
} 

transactions.value = loadTransactions();
    
watch(
  transactions,
  (newValue) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newValue));
  },
  { deep: true }
);

const filterType = ref('all');
const searchText = ref('');
const sortBy = ref('date-desc');

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

// dados fake temporários (só pra ver render)
if (transactions.value.length === 0) {
  transactions.value.push(
    {
      id: "1",
      type: "income",
      date: "2026-02-01",
      category: "Salário",
      description: "Empresa",
      amount: 3000,
    },
    {
      id: "2",
      type: "expense",
      date: "2026-02-02",
      category: "Mercado",
      description: "Compra do mês",
      amount: 450,
    }
  );
}
</script>

<template>
  <div>
    <header class="container">
      <h1>Finance Tracker</h1>
      <p>Controle simples de receitas e despesas</p>
    </header>

    <main class="container">
      <section>
        <h2>Resumo</h2>
        <p>Receitas: <strong>R$ 0,00</strong></p>
        <p>Despesas: <strong>R$ 0,00</strong></p>
        <p>Saldo: <strong>R$ 0,00</strong></p>
      </section>

      <section>
        <h2>Nova transação</h2>

        <div id="feedback" class="feedback" aria-live="polite" aria-atomic="true"></div>

        <form>
          <div class="field">
            <label for="type">Tipo</label>
            <select id="type" name="type">
              <option value="">Selecione</option>
              <option value="income">Receita</option>
              <option value="expense">Despesa</option>
            </select>
            <small id="type-error" class="field-error" aria-live="polite"></small>
          </div>

          <div class="field">
            <label for="amount">Valor</label>
            <input type="number" id="amount" name="amount" min="0.01" step="0.01" />
            <small id="amount-error" class="field-error" aria-live="polite"></small>
          </div>

          <div class="field">
            <label for="date">Data</label>
            <input type="date" id="date" name="date" />
            <small id="date-error" class="field-error" aria-live="polite"></small>
          </div>

          <div class="field">
            <label for="category">Categoria</label>
            <input
              type="text"
              id="category"
              name="category"
              placeholder="Ex: Mercado, Salário"
              autocomplete="off"
            />
            <small id="category-error" class="field-error" aria-live="polite"></small>
          </div>

          <div class="field">
            <label for="description">Descrição (opcional)</label>
            <input
              type="text"
              id="description"
              name="description"
              placeholder="Ex: compra do mês"
              autocomplete="off"
            />
            <small id="description-error" class="field-error" aria-live="polite"></small>
          </div>

          <button type="submit">Adicionar</button>
          <button type="button" id="cancel-edit" hidden>Cancelar Edição</button>
        </form>
      </section>

      <section class="filters" aria-label="Filtros de transações">
  <select v-model="filterType">
    <option value="all">Todas</option>
    <option value="income">Receitas</option>
    <option value="expense">Despesas</option>
  </select>

  <input
    type="text"
    placeholder="Buscar por categoria ou descrição"
    v-model="searchText"
  />

  <button type="button" class="btn btn-secondary" disabled>
    Limpar
  </button>

  <select v-model="sortBy">
    <option value="date-desc">Data (mais recente)</option>
    <option value="date-asc">Data (mais antiga)</option>
    <option value="amount-desc">Valor (maior)</option>
    <option value="amount-asc">Valor (menor)</option>
  </select>
</section>

      <section>
        <h2>Transações</h2>

        <section id="ui-state" class="ui-state" hidden role="status" aria-live="polite"></section>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Categoria</th>
                <th>Descrição</th>
                <th>Valor</th>
                <th>Ações</th>
              </tr>
            </thead>

            <tbody>
  <tr v-for="tx in visibleTransactions" :key="tx.id">
    <td>{{ tx.date }}</td>
    <td>{{ tx.type === "income" ? "Receita" : "Despesa" }}</td>
    <td>{{ tx.category }}</td>
    <td>{{ tx.description }}</td>
    <td>R$ {{ tx.amount.toFixed(2) }}</td>
    <td>
      <button>Editar</button>
      <button>Excluir</button>
    </td>
  </tr>
</tbody>
          </table>
        </div>
      </section>
    </main>

    <footer class="container">
      <p>Finance Tracker — projeto de estudo</p>
    </footer>
  </div>
</template>
