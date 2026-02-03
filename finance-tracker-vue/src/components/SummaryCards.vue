<script setup>
defineProps({
  incomeTotal: { type: Number, required: true },
  expenseTotal: { type: Number, required: true },
  balanceTotal: { type: Number, required: true },
  formatBrl: { type: Function, required: true },
});
</script>

<template>
  <section>
    <h2>Resumo</h2>
    <p>Receitas: <strong>{{ formatBrl(incomeTotal) }}</strong></p>
    <p>Despesas: <strong>{{ formatBrl(expenseTotal) }}</strong></p>
    <p>Saldo: <strong>{{ formatBrl(balanceTotal) }}</strong></p>
  </section>
</template>