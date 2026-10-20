# Documentação do aplicativo MeuDinheiro

## 1. Visão geral

O **MeuDinheiro** é um aplicativo de controle financeiro pessoal feito com React Native e Expo. Seu objetivo é permitir o registro local de receitas e despesas, a consulta do histórico e a visualização de resumos por período e categoria.

O projeto foi pensado para uso offline e não possui autenticação nem integração com servidor. Os dados financeiros são armazenados localmente: em SQLite no Android/iOS e em `localStorage` no navegador.

## 2. Tecnologias e arquitetura

- **Expo SDK 57** e **React Native 0.86**.
- **TypeScript** nas telas e componentes; o módulo SQLite está em JavaScript, com declarações TypeScript separadas.
- **Expo Router** para rotas e navegação por abas.
- **expo-sqlite** para persistência em Android/iOS.
- **localStorage** como persistência alternativa para navegador.
- Componentes React Native com suporte a temas claro e escuro.

O app não usa React Navigation diretamente nem adiciona uma biblioteca de gráficos. A visualização de gastos por categoria é implementada com barras nativas. A alternativa web evita o erro de empacotamento do worker de `expo-sqlite` no servidor Metro de desenvolvimento.

## 3. Funcionalidades implementadas

### Início

Rota `src/app/index.tsx`.

- Exibe o saldo geral calculado como receitas menos despesas.
- Permite navegar entre meses e anos.
- Mostra os totais de receitas e despesas do mês escolhido.
- Lista até cinco movimentações do mês, ordenadas da mais recente para a mais antiga.
- O botão **Ver todas** abre o Histórico.
- O botão flutuante **+** abre o formulário para uma nova movimentação.
- Tocar em uma movimentação abre sua edição.

### Nova movimentação, edição e exclusão

Rota `src/app/new-transaction.tsx`; formulário compartilhado em `src/components/transaction-form.tsx`.

- Alterna entre receita e despesa.
- Recebe o valor por teclado numérico e o converte para centavos inteiros. Por exemplo, `2500` representa R$ 25,00.
- Recebe uma descrição, categoria e data.
- Exibe somente categorias correspondentes ao tipo selecionado.
- Usa a data atual como padrão e aceita datas no formato `AAAA-MM-DD`.
- Valida descrição, valor, categoria e data antes de salvar.
- Reutiliza o formulário para editar uma movimentação existente.
- Exige confirmação antes de excluir uma movimentação.

### Histórico

Rota `src/app/history.tsx`.

- Lista as movimentações em ordem cronológica inversa.
- Permite pesquisar por texto da descrição.
- Oferece filtros por tipo (todas, receitas ou despesas) e categoria.
- Tocar em um registro abre a tela de edição/exclusão.

### Relatórios

Rota `src/app/reports.tsx`.

- Permite selecionar mês e ano.
- Mostra receitas, despesas e resultado líquido do mês.
- Agrupa despesas por categoria.
- Exibe o percentual de cada categoria e barras proporcionais, incluindo uma barra horizontal segmentada.

### Navegação e componentes reutilizáveis

- `src/components/app-tabs.tsx` define as abas Início, Histórico e Relatórios.
- A tela de movimentação não aparece como aba; é acessada a partir dos botões ou dos registros.
- `src/components/month-selector.tsx` reutiliza a navegação de período.
- `src/components/transaction-row.tsx` reutiliza a apresentação dos registros.
- `src/utils/finance.ts` contém funções de formatação monetária e de datas.

## 4. Banco de dados

O banco local tem o nome `meudinheiro.db`. Ele é aberto e inicializado na primeira chamada a `getDatabase()`.

### Tabela `categorias`

- `id`: chave primária autoincremental.
- `nome`: obrigatório, com comparação sem distinção de maiúsculas/minúsculas.
- `tipo`: obrigatório, limitado a `receita` ou `despesa`.
- Uma mesma combinação de nome e tipo não pode ser duplicada.

### Tabela `transacoes`

- `id`: chave primária autoincremental.
- `categoria_id`: referência à categoria.
- `descricao`: obrigatória e não vazia.
- `valor_centavos`: inteiro positivo.
- `tipo`: `receita` ou `despesa`.
- `data`: texto no formato `AAAA-MM-DD`.
- `criado_em`: data/hora de criação preenchida pelo SQLite.
- A chave estrangeira composta (`categoria_id`, `tipo`) impede associar uma receita a uma categoria de despesa, ou vice-versa.

Também são criados índices para data e categoria, e a verificação de chaves estrangeiras é ativada. Na inicialização, o app insere 11 categorias padrão: Salário, Freelance, Investimentos, Outros, Alimentação, Transporte, Moradia, Saúde, Educação e Lazer, com “Outros” disponível nos dois tipos.

### Operações disponíveis

O módulo `src/database/database.js` exporta:

- `getDatabase()`: inicializa e retorna a conexão, compartilhando uma promessa de inicialização para evitar aberturas simultâneas duplicadas.
- `getCategories(tipo?)`: lista as categorias, opcionalmente filtradas por tipo.
- `getTransactions(filtros?)`: lista movimentações com busca, tipo, categoria, mês, ano e limite opcionais.
- `getTransactionById(id)`: busca uma movimentação pelo identificador.
- `createTransaction(dados)`: cria uma movimentação.
- `updateTransaction(id, dados)`: atualiza uma movimentação.
- `deleteTransaction(id)`: exclui uma movimentação.
- `getMonthlySummary(mes, ano)`: calcula totais de receita, despesa e saldo do mês.
- `getCategorySpending(mes, ano)`: calcula as despesas agrupadas por categoria.
- `getOverallBalance()`: calcula o saldo de todas as movimentações.

Os formatos dos parâmetros e retornos estão declarados em `src/database/database.d.ts`.

### Armazenamento na web

O arquivo `src/database/database.web.ts` implementa as mesmas operações de dados para navegador. As categorias e movimentações são salvas no `localStorage`, sob a chave `meudinheiro.web.database.v1`. Os dados persistem nesse navegador, mas não são compartilhados com o banco SQLite do celular e podem ser apagados ao limpar os dados do site. O acesso direto a uma conexão SQL não está disponível na web; as telas usam as funções de dados compartilhadas.

## 5. Organização relevante dos arquivos

```text
src/
├── app/
│   ├── _layout.tsx
│   ├── index.tsx
│   ├── history.tsx
│   ├── new-transaction.tsx
│   └── reports.tsx
├── components/
│   ├── app-tabs.tsx
│   ├── month-selector.tsx
│   ├── transaction-form.tsx
│   └── transaction-row.tsx
├── database/
│   ├── database.js
│   ├── database.web.ts
│   └── database.d.ts
└── utils/
    └── finance.ts
```

O projeto também contém componentes de tema e interface usados pelo template Expo. A especificação funcional original está em `especifica_o_do_projeto.md`.

## 6. Correções realizadas durante o desenvolvimento

- Foi criado o módulo de inicialização do SQLite, que antes não estava ligado ao app.
- Foram adicionadas as operações de consulta, inserção, edição, exclusão e cálculo de resumos.
- Foi criado o formulário com confirmação de exclusão e integração ao banco.
- Foram criadas as telas Início, Histórico e Relatórios e registradas as rotas.
- Foi adicionada uma implementação web das operações de dados em `localStorage`, mantendo SQLite em Android/iOS e contornando o erro do worker no Metro de desenvolvimento web.
- A variante web da navegação por abas foi implementada para corrigir a tela inicial que falhava ao renderizar no navegador.
- O componente `ExternalLink`, que estava vazio, foi restaurado para corrigir um erro de TypeScript.
- A seleção de cores das abas foi ajustada para funcionar com o tema claro/escuro e corrigir outro erro de TypeScript.

## 7. Validações realizadas

- `npx tsc --noEmit`: passou após as correções de TypeScript.
- `npx expo export --platform ios`: o Expo gerou o bundle iOS com sucesso.
- `npx expo start --web --clear`: reproduziu o erro `Worker chunk not found` para `expo-sqlite/web/worker.ts`; a implementação específica para web evita importar esse worker.
- `npx expo export --platform web --dev`: gerou o bundle web de desenvolvimento com sucesso.
- SQL de criação, dados iniciais, inserção, busca, edição, exclusão, resumo mensal, agrupamento por categoria e integridade da chave estrangeira foram exercitados com SQLite local.
- `git diff --check`: usado para verificar problemas de whitespace durante as alterações.

Essas verificações confirmam compilação estática, geração do bundle e comportamento das consultas SQL testadas. O app ainda não foi validado interativamente em um aparelho físico ou emulador.

## 8. Requisitos e limitações atuais

| Requisito | Situação atual |
|---|---|
| Cadastrar receitas e despesas | Implementado |
| Informar valor, descrição, categoria e data | Implementado |
| Consultar movimentações | Implementado |
| Editar movimentações | Implementado |
| Excluir com confirmação | Implementado |
| Calcular saldo geral e totais mensais | Implementado |
| Histórico filtrado por tipo e categoria | Implementado |
| Busca por descrição | Implementado |
| Filtro mensal no histórico | A consulta de dados suporta mês e ano, mas a interface do Histórico ainda não oferece esse filtro |
| Gerenciar categorias pelo usuário | Não implementado; há categorias iniciais fixas |
| Relatório mensal por categoria | Implementado com barras; não há gráfico de rosca |
| Limites de gastos por categoria | Não implementado |
| Seletor visual de calendário | Não implementado; a data é digitada em formato ISO |
| Teste manual no Expo Go/aparelho e no navegador | Pendente |
| Configuração e execução de lint | Pendente; o projeto não possui configuração ESLint pronta |

## 9. Como executar

Com as dependências instaladas:

```bash
npm start
```

Para abrir diretamente em uma plataforma:

```bash
npm run android
npm run ios
npm run web
```

O arquivo persistente `meudinheiro.db` é inicializado em Android/iOS quando uma operação solicita a conexão. Na web, as operações inicializam as categorias padrão no `localStorage`. Os dados das plataformas não são sincronizados.

## 10. Próximos passos recomendados

1. Rodar o app no Expo Go ou em um emulador e testar um ciclo completo de cadastro, edição e exclusão.
2. Adicionar filtro de mês e ano à tela Histórico.
3. Criar uma tela ou fluxo para cadastrar e gerenciar categorias personalizadas.
4. Substituir a digitação da data por um seletor visual compatível com Android e iOS.
5. Adicionar limites mensais de gastos por categoria, se fizerem parte do escopo final.
6. Configurar lint e incluir testes automatizados focados nas operações do banco e nos fluxos do formulário.
