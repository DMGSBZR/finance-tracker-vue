<script setup>
import { ref } from "vue";

const props = defineProps({
  items: { type: Array, required: true },
  removingIds: {
    type: Object,
    required: true,
    validator: (v) => v instanceof Set,
  },
  getCategoryColor: { type: Function, required: true },
  categoriesByType: { type: Object, required: true },
});

const emit = defineEmits(["edit", "delete", "update"]);

// estado local (UI-only)
const editingCategoryTxId = ref(null);
const selectedCategory = ref("");

function startCategoryEdit(tx) {
  editingCategoryTxId.value = tx.id;
  selectedCategory.value = "";
}

function cancelCategoryEdit() {
  editingCategoryTxId.value = null;
  selectedCategory.value = "";
}

function confirmCategoryEdit(tx) {
  if (!selectedCategory.value) return;

  emit("update", {
    ...tx,
    category: selectedCategory.value,
  });

  cancelCategoryEdit();
}
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
          :class="{ 'is-removing': removingIds.has(tx.id) }"
        >
          <td>{{ tx.date }}</td>
          <td>{{ tx.type === "income" ? "Receita" : "Despesa" }}</td>

          <td>
            <div class="category-badge">
              <span
                v-if="tx.category"
                class="category-dot"
                :style="{ backgroundColor: getCategoryColor(tx.type, tx.category) }"
                aria-hidden="true"
              ></span>

              <span>{{ tx.category || "Sem categoria ⚠" }}</span>

              <button
                v-if="!tx.category && editingCategoryTxId !== tx.id"
                type="button"
                class="btn btn-secondary"
                @click="startCategoryEdit(tx)"
              >
                Escolher categoria
              </button>
            </div>

            <div
              v-if="editingCategoryTxId === tx.id"
              style="margin-top: 8px; display: flex; gap: 8px; align-items: center;"
            >
              <select v-model="selectedCategory">
                <option value="">Selecione…</option>
                <option
                  v-for="cat in (categoriesByType?.[tx.type] ?? [])"
                  :key="cat.name"
                  :value="cat.name"
                >
                  {{ cat.name }}
                </option>
              </select>

              <button
                type="button"
                class="btn btn-primary"
                :disabled="!selectedCategory"
                @click="confirmCategoryEdit(tx)"
              >
                OK
              </button>

              <button type="button" class="btn" @click="cancelCategoryEdit">
                Cancelar
              </button>
            </div>
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
