import { ref, watch } from "vue";

export function useLocalStorage(key, defaultValue) {
  const state = ref(defaultValue);

  // Load inicial
  try {
    const raw = localStorage.getItem(key);
    if (raw != null) {
      state.value = JSON.parse(raw);
    }
  } catch {
    state.value = defaultValue;
  }

  // Persistência reativa
  watch(
    state,
    (newValue) => {
      localStorage.setItem(key, JSON.stringify(newValue));
    },
    { deep: true }
  );

  return state;
}
