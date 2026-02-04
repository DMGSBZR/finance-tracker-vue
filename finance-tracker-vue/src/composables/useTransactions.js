import { ref } from "vue";
import { TRANSACTION_TYPES } from "../domain/transactionTypes";
import { CATEGORIES } from "../domain/categories";

function isValidCategory(type, category) {
  if (!type || !category) return false;

  return CATEGORIES[type]?.includes(category);
}

export function useTransactions(transactionsRef) {
  const form = ref({
    type: "",
    amount: "",
    date: "",
    category: "",
    description: "",
  });

  const editingId = ref(null);
  const errors = ref({});

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

  function validateForm() {
    const e = {};

    if (!form.value.type) e.type = "Selecione o tipo";
    if (!form.value.amount || Number(form.value.amount) <= 0)
      e.amount = "Informe um valor válido";
    if (!form.value.date) e.date = "Informe a data";
    if (!isValidCategory(form.value.type, form.value.category)) {
  e.category = "Categoria inválida para o tipo selecionado";
}

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
      const index = transactionsRef.value.findIndex(
        (t) => t.id === editingId.value
      );
      if (index !== -1) transactionsRef.value[index] = tx;
      editingId.value = null;
    } else {
      transactionsRef.value.push(tx);
    }

    resetForm();
  }

  function editTransaction(tx) {
    editingId.value = tx.id;
    form.value = {
      type: tx.type,
      amount: tx.amount,
      date: tx.date,
      category: tx.category,
      description: tx.description ?? "",
    };
    errors.value = {};
  }

  function cancelEdit() {
    editingId.value = null;
    resetForm();
  }

  function deleteTransaction(id) {
    transactionsRef.value = transactionsRef.value.filter((t) => t.id !== id);
  }

  return {
    form,
    editingId,
    errors,
    submitForm,
    editTransaction,
    cancelEdit,
    deleteTransaction,
  };
}
