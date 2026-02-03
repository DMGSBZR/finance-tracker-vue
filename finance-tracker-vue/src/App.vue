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

function formatBRL(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
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

    const form = ref({
      type: '',
      amount: '',
      date: '',
      category: '',
      description: ''
    });

    const editingId = ref(null);
    const errors = ref({});

    function validateForm() {
      const e = {};

      if(!form.value.type) e.type = "Selecione o tipo";
      if(!form.value.amount || Number(form.value.amount) <= 0) e.amount = "Informe um valor válido";
      if(!form.value.date) e.date = "Informe a data";
      if(!form.value.category.trim()) e.category = "Informe a categoria";

      errors.value = e;
      return Object.keys(e).length === 0;
    }

function submitForm() {
  if (!validateForm()) return;

  const tx = {
    id: editingId.value ?? crypto.randomUUID(),
    type: form.value.type,
    amount: Number(form.value.amount),
    date: form.value.date,
    category: form.value.category.trim(),
    description: form.value.description.trim(),
  };

  if (editingId.value) {
    const index = transactions.value.findIndex((t) => t.id === editingId.value);
    if (index !== -1) {
      transactions.value[index] = tx;
    }
    editingId.value = null;
  } else {
    transactions.value.push(tx);
  }

  resetForm();
}
function resetForm() {
  form.value = {
    type: "",
    amount: "",
    date: "",
    category: "",
    description: "",
  };
  errors.value = {};
}
function editTransaction(tx) {
  editingId.value = tx.id;
  form.value = {
    type: tx.type,
    amount: tx.amount,
    date: tx.date,
    category: tx.category,
    description: tx.description,
  };
}

function deleteTransaction(id) {
  transactions.value = transactions.value.filter((t) => t.id !== id);
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
  <p>Receitas: <strong>{{ formatBRL(incomeTotal) }}</strong></p>
  <p>Despesas: <strong>{{ formatBRL(expenseTotal) }}</strong></p>
  <p>Saldo: <strong>{{ formatBRL(balanceTotal) }}</strong></p>
</section>

      <section>
        <h2>Nova transação</h2>

        <div id="feedback" class="feedback" aria-live="polite" aria-atomic="true"></div>

        <form @submit.prevent="submitForm">

  <div class="field">
    <label>Tipo</label>
    <select v-model="form.type">
      <option value="">Selecione</option>
      <option value="income">Receita</option>
      <option value="expense">Despesa</option>
    </select>
    <small class="field-error">{{ errors.type }}</small>
  </div>

  <div class="field">
    <label>Valor</label>
    <input type="number" v-model="form.amount" />
    <small class="field-error">{{ errors.amount }}</small>
  </div>

  <div class="field">
    <label>Data</label>
    <input type="date" v-model="form.date" />
    <small class="field-error">{{ errors.date }}</small>
  </div>

  <div class="field">
    <label>Categoria</label>
    <input type="text" v-model="form.category" />
    <small class="field-error">{{ errors.category }}</small>
  </div>

  <div class="field">
    <label>Descrição</label>
    <input type="text" v-model="form.description" />
  </div>

  <button type="submit">
    {{ editingId ? "Salvar" : "Adicionar" }}
  </button>

  <button
    type="button"
    v-if="editingId"
    @click="() => { editingId = null; resetForm(); }"
  >
    Cancelar Edição
  </button>
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
      <button type="button @click="editTransaction(tx)>editar</button>
      <button type="button @click="deleteTransaction(tx.id)>Excluir</button>
      
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
