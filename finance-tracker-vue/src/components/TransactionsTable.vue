<script setup>
defineProps({
  items: { type: Array, required: true },
});

const emit = defineEmits(["edit", "delete"]);
</script>

<template>
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
        <tr v-for="tx in items" :key="tx.id">
          <td>{{ tx.date }}</td>
          <td>{{ tx.type === "income" ? "Receita" : "Despesa" }}</td>
          <td>{{ tx.category }}</td>
          <td>{{ tx.description }}</td>
          <td>R$ {{ Number(tx.amount).toFixed(2) }}</td>
          <td>
            <button type="button" @click="emit('edit', tx)">Editar</button>
            <button type="button" @click="emit('delete', tx.id)">Excluir</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
