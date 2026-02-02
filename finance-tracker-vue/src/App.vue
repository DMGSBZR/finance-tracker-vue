<template>
  <div>
    <header class="container">
      <h1>Finance Tracker</h1>
      <p>Controle simples de receitas e despesas</p>
    </header>

    <main class="container">
      <section>
        <h2>Resumo</h2>
        <p>Receitas: <strong>R$ 0,00</strong></p>
        <p>Despesas: <strong>R$ 0,00</strong></p>
        <p>Saldo: <strong>R$ 0,00</strong></p>
      </section>

      <section>
        <h2>Nova transação</h2>

        <div id="feedback" class="feedback" aria-live="polite" aria-atomic="true"></div>

        <form>
          <div class="field">
            <label for="type">Tipo</label>
            <select id="type" name="type">
              <option value="">Selecione</option>
              <option value="income">Receita</option>
              <option value="expense">Despesa</option>
            </select>
            <small id="type-error" class="field-error" aria-live="polite"></small>
          </div>

          <div class="field">
            <label for="amount">Valor</label>
            <input type="number" id="amount" name="amount" min="0.01" step="0.01" />
            <small id="amount-error" class="field-error" aria-live="polite"></small>
          </div>

          <div class="field">
            <label for="date">Data</label>
            <input type="date" id="date" name="date" />
            <small id="date-error" class="field-error" aria-live="polite"></small>
          </div>

          <div class="field">
            <label for="category">Categoria</label>
            <input
              type="text"
              id="category"
              name="category"
              placeholder="Ex: Mercado, Salário"
              autocomplete="off"
            />
            <small id="category-error" class="field-error" aria-live="polite"></small>
          </div>

          <div class="field">
            <label for="description">Descrição (opcional)</label>
            <input
              type="text"
              id="description"
              name="description"
              placeholder="Ex: compra do mês"
              autocomplete="off"
            />
            <small id="description-error" class="field-error" aria-live="polite"></small>
          </div>

          <button type="submit">Adicionar</button>
          <button type="button" id="cancel-edit" hidden>Cancelar Edição</button>
        </form>
      </section>

      <section class="filters" aria-label="Filtros de transações">
        <select id="filter-type">
          <option value="all">Todas</option>
          <option value="income">Receitas</option>
          <option value="expense">Despesas</option>
        </select>

        <input type="text" id="search-text" placeholder="Buscar por categoria ou descrição" />

        <button id="clear-filters" type="button" class="btn btn-secondary" disabled>
          Limpar
        </button>

        <select id="sort-by">
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

            <tbody id="transactions-body"></tbody>
          </table>
        </div>
      </section>
    </main>

    <footer class="container">
      <p>Finance Tracker — projeto de estudo</p>
    </footer>
  </div>
</template>
