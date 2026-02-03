<script setup>
import { computed, nextTick, ref, watch } from "vue";

const props = defineProps({
  modelValue: { type: Object, required: true }, // form
  errors: { type: Object, required: true },
  isEditing: { type: Boolean, required: true },
});

const emit = defineEmits(["update:modelValue", "submit", "cancel"]);

const amountInputRef = ref(null);

// Helpers para atualizar campos sem mutar props diretamente
const updateField = (key, value) => {
  emit("update:modelValue", { ...props.modelValue, [key]: value });
};

// Foco automático quando entrar em modo edição
watch(
  () => props.isEditing,
  async (editing) => {
    if (!editing) return;
    await nextTick();
    amountInputRef.value?.focus();
  }
);

const submitLabel = computed(() => (props.isEditing ? "Salvar" : "Adicionar"));
</script>

<template>
  <section>
    <h2>Nova transação</h2>

    <div id="feedback" class="feedback" aria-live="polite" aria-atomic="true"></div>

    <form @submit.prevent="emit('submit')">
      <div class="field">
        <label for="type">Tipo</label>

        <select
          id="type"
          :value="modelValue.type"
          @change="updateField('type', $event.target.value)"
        >
          <option value="">Selecione</option>
          <option value="income">Receita</option>
          <option value="expense">Despesa</option>
        </select>

        <small v-if="errors.type" class="field-error">{{ errors.type }}</small>
      </div>

      <div class="field">
        <label for="amount">Valor</label>

        <input
          id="amount"
          ref="amountInputRef"
          type="number"
          :value="modelValue.amount"
          @input="updateField('amount', $event.target.value)"
        />

        <small v-if="errors.amount" class="field-error">{{ errors.amount }}</small>
      </div>

      <div class="field">
        <label for="date">Data</label>

        <input
          id="date"
          type="date"
          :value="modelValue.date"
          @input="updateField('date', $event.target.value)"
        />

        <small v-if="errors.date" class="field-error">{{ errors.date }}</small>
      </div>

      <div class="field">
        <label for="category">Categoria</label>

        <input
          id="category"
          type="text"
          :value="modelValue.category"
          @input="updateField('category', $event.target.value)"
        />

        <small v-if="errors.category" class="field-error">{{ errors.category }}</small>
      </div>

      <div class="field">
        <label for="description">Descrição</label>

        <input
          id="description"
          type="text"
          :value="modelValue.description"
          @input="updateField('description', $event.target.value)"
        />
      </div>

      <button type="submit">{{ submitLabel }}</button>

      <button v-if="isEditing" type="button" @click="emit('cancel')">
        Cancelar Edição
      </button>
    </form>
  </section>
</template>
