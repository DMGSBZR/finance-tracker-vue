<script setup>
const props = defineProps({
  items: { type: Array, required: true },
  removingIds: { type: Object, required: true }, // Set
  getCategoryColor: { type: Function, required: true },
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
        <tr
          v-for="tx in items"
          :key="tx.id"
          :class="{ 'is-removing': props.removingIds.has(tx.id) }"
        >
          <td>{{ tx.date }}</td>
          <td>{{ tx.type === "income" ? "Receita" : "Despesa" }}</td>
          <td>
  <span class="category-badge">
    <span
      v-if="tx.category"
      class="category-dot"
      :style="{ backgroundColor: props.getCategoryColor(tx.type, tx.category) }"
      aria-hidden="true"
    ></span>

    <span>{{ tx.category || "—" }}</span>
  </span>
</td>
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
