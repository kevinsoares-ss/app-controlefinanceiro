# Especificação Técnica do Projeto — MeuDinheiro

**Aplicativo Mobile de Controle Financeiro Pessoal**  
**Tecnologias principais:** React Native, Expo, SQLite, JavaScript.  
**Modo de Operação:** Local / *Offline-first* (Sem autenticação).

---

## 1. Visão Geral do Projeto

### 1.1. Contexto e Problema
A gestão de finanças pessoais é um desafio frequente. A falta de acompanhamento de receitas e despesas pequenas dificulta o planejamento financeiro, levando a gastos descontrolados. A ausência de ferramentas simples e diretas impede muitos usuários de realizarem esse acompanhamento com constância.

### 1.2. Solução Proposta
O **MeuDinheiro** é uma aplicação mobile focada na simplicidade e na usabilidade. Permite ao usuário registrar receitas e despesas rapidamente, associá-las a categorias e visualizar dados consolidados (saldo geral, saldos mensais e gráficos de gastos), sem a necessidade de criar uma conta ou fornecer dados pessoais em servidores na nuvem.

### 1.3. Objetivos
* **Objetivo Geral:** Desenvolver uma aplicação mobile com React Native para auxílio na gestão financeira pessoal de forma rápida e offline.
* **Objetivos Específicos:**
  * Permitir o cadastro, edição e exclusão de movimentações (receitas e despesas).
  * Classificar movimentações por categorias pré-definidas ou customizadas.
  * Armazenar os dados localmente no dispositivo via SQLite.
  * Exibir o saldo atualizado e o resumo mensal de forma automática.
  * Filtrar transações por período e tipo de gastos.

---

## 2. Requisitos do Sistema

### 2.1. Requisitos Funcionais (RF)

| Código | Descrição do Requisito | Prioridade |
| :--- | :--- | :--- |
| **RF01** | Permitir cadastrar transações (receitas ou despesas). | Essencial |
| **RF02** | Informar valor, descrição, categoria e data na transação. | Essencial |
| **RF03** | Listar todas as movimentações financeiras cadastradas. | Essencial |
| **RF04** | Permitir a edição dos dados de uma movimentação existente. | Essencial |
| **RF05** | Excluir movimentações financeiras com confirmação prévia. | Essencial |
| **RF06** | Calcular automaticamente o saldo com base nas receitas e despesas. | Essencial |
| **RF07** | Exibir os totais de receitas e despesas do período selecionado. | Essencial |
| **RF08** | Filtrar a visualização do histórico por mês, ano e categoria. | Importante |
| **RF09** | Permitir o gerenciamento (listagem e cadastro) de categorias. | Essencial |
| **RF10** | Persistir todas as informações no dispositivo (banco local SQLite). | Essencial |
| **RF11** | Apresentar um resumo financeiro e estatístico mensal do usuário. | Importante |
| **RF12** | Permitir a definição de limite de gastos por categoria. | Evolução |

### 2.2. Requisitos Não Funcionais (RNF)

| Código | Descrição | Estratégia de Atendimento |
| :--- | :--- | :--- |
| **RNF01** | **Usabilidade:** Interface clara, acessível e intuitiva. | Design limpo com poucos passos para ações principais. |
| **RNF02** | **Desempenho:** Respostas rápidas nas consultas e cálculos. | Banco de dados local indexado e cálculo local otimizado. |
| **RNF03** | **Persistência Local:** Garantia de manutenção do estado. | Utilização do pacote `expo-sqlite` para transações ACID. |
| **RNF04** | **Privacidade:** Privacidade total do usuário. | Nenhum dado é enviado para servidores externos. |
| **RNF05** | **Integridade de Dados:** Validação de entradas. | Armazenamento de moedas em centavos e datas em ISO. |
| **RNF06** | **Compatibilidade:** Suporte ao ecossistema Android. | Testado no ambiente Expo Go via dispositivo físico e emulador. |

---

## 3. Regras de Negócio (RN)

* **RN01 — Validez dos Valores:** O valor numérico de qualquer movimentação deve ser estritamente maior que zero ($valor > 0$).
* **RN02 — Classificação Obrigatória:** Toda transação deve possuir um tipo explícito: `RECEITA` ou `DESPESA`.
* **RN03 — Cálculo do Saldo:**  
  $$\text{Saldo} = \sum \text{Receitas} - \sum \text{Despesas}$$
* **RN04 — Vínculo de Categoria:** Toda movimentação precisa estar vinculada a uma categoria válida. O tipo da categoria deve ser compatível com o tipo da transação.
* **RN05 — Precisão Monetária:** Os valores financeiros devem ser guardados em centavos como números inteiros (`INTEGER`) no banco de dados para prevenir problemas de arredondamento com pontuação flutuante.
* **RN06 — Confirmação de Exclusão:** Operações destrutivas (remoção de registros) exigem confirmação do usuário antes da execução final no SQLite.
* **RN07 — Atualização Dinâmica:** Edições ou exclusões devem disparar o recálculo imediato do saldo e atualização da tela inicial.

---

## 4. Modelagem do Banco de Dados (SQLite)

### 4.1. Esquema Relacional

```
+-------------------+       1:N       +-------------------+
|    CATEGORIAS     |----------------<|    TRANSACOES     |
+-------------------+                 +-------------------+
| PK id             |                 | PK id             |
|    nome           |                 | FK categoria_id   |
|    tipo           |                 |    descricao      |
+-------------------+                 |    valor_centavos |
                                      |    tipo           |
                                      |    data           |
                                      |    criado_em      |
                                      +-------------------+
```

### 4.2. Estrutura das Tabelas (SQL DDL)

```sql
-- Criação da tabela de Categorias
CREATE TABLE IF NOT EXISTS categorias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    tipo TEXT CHECK(tipo IN ('RECEITA', 'DESPESA')) NOT NULL
);

-- Criação da tabela de Transações
CREATE TABLE IF NOT EXISTS transacoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    categoria_id INTEGER NOT NULL,
    descricao TEXT NOT NULL,
    valor_centavos INTEGER NOT NULL,
    tipo TEXT CHECK(tipo IN ('RECEITA', 'DESPESA')) NOT NULL,
    data TEXT NOT NULL, -- Formato: YYYY-MM-DD
    criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE RESTRICT
);
```

### 4.3. Carga Inicial de Dados (Seed Values)

```sql
INSERT INTO categorias (nome, tipo) VALUES 
('Salário', 'RECEITA'),
('Freelance', 'RECEITA'),
('Investimentos', 'RECEITA'),
('Outros (Receita)', 'RECEITA'),
('Alimentação', 'DESPESA'),
('Transporte', 'DESPESA'),
('Moradia', 'DESPESA'),
('Saúde', 'DESPESA'),
('Educação', 'DESPESA'),
('Lazer', 'DESPESA'),
('Outros (Despesa)', 'DESPESA');
```

---

## 5. Próximos Passos do Projeto

1. **Definição da Arquitetura do App:** Escolha das bibliotecas complementares (`react-navigation`, `victory-native` ou `react-native-chart-kit` para gráficos).
2. **Prototipagem Wireframe:** Desenho dos fluxos e layouts visuais das 4 telas principais (Dashboard, Form de Cadastro, Histórico e Relatórios).
3. **Setup do Projeto Expo:** Inicialização da estrutura de pastas, configuração do `expo-sqlite` e criação do script de migração inicial.