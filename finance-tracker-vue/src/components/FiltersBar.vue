<script setup>
const props = defineProps({
  filterType: { type: String, required: true },
  searchText: { type: String, required: true },
  sortBy: { type: String, required: true },
  hasActiveFilters: { type: Boolean, required: true },
});

const emit = defineEmits([
  "update:filterType",
  "update:searchText",
  "update:sortBy",
  "clear",
]);
</script>

<template>
  <section class="filters" aria-label="Filtros de transações">
    <select
      :value="filterType"
      @change="emit('update:filterType', $event.target.value)"
    >
      <option value="all">Todas</option>
      <option value="income">Receitas</option>
      <option value="expense">Despesas</option>
    </select>

    <input
      type="text"
      placeholder="Buscar por categoria ou descrição"
      :value="searchText"
      @input="emit('update:searchText', $event.target.value)"
    />

    <button
      type="button"
      class="btn btn-secondary"
      @click="emit('clear')"
      :disabled="!hasActiveFilters"
      :aria-disabled="!hasActiveFilters"
    >
      Limpar filtros
    </button>

    <select
      :value="sortBy"
      @change="emit('update:sortBy', $event.target.value)"
    >
      <option value="date-desc">Data (mais recente)</option>
      <option value="date-asc">Data (mais antiga)</option>
      <option value="amount-desc">Valor (maior)</option>
      <option value="amount-asc">Valor (menor)</option>
    </select>
  </section>
</template>
