# Architecture Overview — Finance Tracker

Este projeto segue uma arquitetura em camadas com separação clara de responsabilidades.
O objetivo é manter regras de negócio independentes de framework e UI.

## Camadas

### 1. Core / Domain (`src/core/domain`)
Responsável pelas regras soberanas do sistema.

- Normalização e validação de dados
- Correção automática de estados inválidos
- Tolerância a dados legados
- Não depende de Vue, browser ou storage

Exemplos:
- normalizeTransactionsList
- transactionTypes
- categories
- schema/versioning

---

### 2. Core / Use-Cases (`src/core/useCases`)
Responsável por definir fluxos de aplicação.

- Aplica mudanças usando o domínio
- Retorna o próximo estado (imutável)
- Não lida com UI, feedback ou persistência

Exemplos:
- applyTransactionUpdate
- revalidateTransactions

---

### 3. Infra / Adapters (`useLocalStorage`, futuros adapters)
Responsável por IO e persistência.

- Leitura e escrita de dados
- Versionamento de storage
- Não contém regras de negócio

Exemplos:
- useLocalStorage

---

### 4. Application Orchestrator (`App.vue`)
Responsável por coordenar o fluxo da aplicação.

- Chama use-cases
- Gerencia undo/redo
- Controla feedback, foco e confirmações
- Conecta UI ao core

Exemplos:
- handleUpdateTransaction
- pushUndo / redo
- showFeedback

---

### 5. UI / Components (`src/components`)
Responsável apenas por apresentação e intenção.

- Renderiza estado
- Emite eventos
- Não valida nem corrige dados

Exemplos:
- TransactionsTable
- TransactionForm
- FiltersBar
