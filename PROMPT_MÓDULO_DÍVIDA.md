# IMPLEMENTAÇÃO DO MÓDULO DE DÍVIDAS

Você é responsável pela implementação do módulo de DÍVIDAS de um sistema de gestão financeira doméstica.

O sistema possui atualmente as páginas:

1. Dashboard
2. Minha Carteira
3. Transações
4. Relatórios
5. Configurações

Não altere a arquitetura visual existente nem crie novas páginas principais.

O módulo de Dívidas deve ser implementado dentro da estrutura atual do sistema, preferencialmente em Minha Carteira, utilizando os componentes, padrões visuais, autenticação, permissões e arquitetura já existentes.

---

# OBJETIVO

Criar um módulo independente para cadastro e acompanhamento de dívidas.

A dívida representa uma OBRIGAÇÃO FINANCEIRA.

A transação representa uma MOVIMENTAÇÃO FINANCEIRA REAL.

Esses conceitos precisam permanecer separados.

REGRA ABSOLUTA:

Cadastrar uma dívida NÃO cria uma transação.

Registrar uma dívida NÃO altera saldo de conta.

Registrar uma dívida NÃO cria despesa.

Registrar uma dívida NÃO altera os KPIs financeiros do Dashboard.

Somente uma transação financeira de saída representa dinheiro efetivamente pago.

---

# MODELO CONCEITUAL

DÍVIDA
↓
Obrigação financeira

TRANSAÇÃO
↓
Movimentação financeira real

A relação entre elas é opcional:

TRANSACTION.debt_id → DEBT.id

Se debt_id = NULL:

A transação não está vinculada a uma dívida.

Se debt_id possui valor:

A transação representa um pagamento da dívida correspondente.

---

# EXEMPLO OBRIGATÓRIO

Cadastrar:

Dívida = R$ 5.000

Nenhuma transação deve ser criada.

Posteriormente criar:

Transação:
-R$ 2.000

Categoria:
Dívidas

Dívida:
Dívida X

Resultado:

Valor original:
R$ 5.000

Total pago:
R$ 2.000

Saldo:
R$ 3.000

Depois:

Nova transação:
-R$ 500

Resultado:

Total pago:
R$ 2.500

Saldo:
R$ 2.500

Depois:

Nova transação:
-R$ 2.500

Resultado:

Saldo:
R$ 0

Status:
QUITADA

---

# PAGAMENTOS PARCIAIS

Implementar suporte nativo para pagamentos parciais.

Uma dívida não precisa ser quitada em uma única transação.

Suportar quantidade ilimitada de pagamentos.

O saldo deve ser recalculado a partir das transações vinculadas.

---

# IMPORTANTE: NÃO CONFUNDIR PARCELAMENTO COM PAGAMENTO

Parcelamento representa uma condição acordada.

Pagamento representa o valor efetivamente pago.

Exemplo:

Dívida:
R$ 10.000

Parcelamento:
10x de R$ 1.000

O usuário pode efetivamente pagar:

R$ 500

ou:

R$ 1.500

ou:

R$ 2.000

O sistema deve registrar o pagamento real sem assumir que ele obrigatoriamente corresponde ao valor da parcela.

---

# CADASTRO

Criar modal "Nova dívida".

Campos:

- Nome
- Credor
- Descrição
- Categoria
- Responsável
- Visibilidade
- Valor original
- Data de origem
- Data de vencimento
- Possui juros
- Taxa de juros
- Tipo de juros
- Possui multa
- Valor/taxa da multa
- Permite parcelamento
- Quantidade de parcelas
- Valor estimado da parcela
- Permite antecipação
- Valor de quitação à vista
- Prioridade
- Observações

Responsável:

- Eu
- Esposa
- Nossa Casa

Visibilidade:

- Privada
- Compartilhada
- Casa

Prioridade:

- Baixa
- Média
- Alta
- Crítica

---

# VALORES CALCULADOS

Não permitir edição manual recorrente de:

- total pago;
- saldo devedor;
- percentual quitado;
- economia potencial.

Esses valores devem ser derivados do estado real dos dados.

Preferencialmente:

paid_amount =
SUM(transações válidas vinculadas)

remaining_amount =
base da dívida + encargos aplicáveis - paid_amount

paid_percentage =
paid_amount / valor_base * 100

Nunca permitir saldo negativo.

---

# QUITAÇÃO À VISTA

Permitir informar:

Valor original:
R$ 5.000

Saldo:
R$ 5.000

Quitação à vista:
R$ 3.800

Calcular:

Economia potencial:
R$ 1.200

Desconto:
24%

Não alterar o saldo da dívida apenas porque o valor de quitação à vista foi informado.

O saldo só deve mudar quando houver pagamento real.

---

# INTEGRAÇÃO COM TRANSAÇÕES

Adicionar no modelo de TRANSACTION:

debt_id nullable

No formulário "Nova despesa":

Quando:

Categoria = Dívidas

mostrar:

Dívida vinculada

O campo deve ser opcional.

Opções:

- Nenhuma
- Dívidas disponíveis para o usuário

Se nenhuma dívida for selecionada:

Criar transação normalmente.

Se uma dívida for selecionada:

Criar transação e vincular ao debt_id.

---

# REGISTRAR PAGAMENTO

Dentro dos detalhes da dívida, criar:

[Registrar pagamento]

Ao clicar, abrir o formulário de transação de saída já contextualizado.

Preencher automaticamente:

Tipo:
Despesa

Categoria:
Dívidas

Dívida:
Dívida atual

Solicitar:

- Valor
- Conta
- Data
- Descrição
- Observação

Ao confirmar:

1. Criar transação.
2. Vincular à dívida.
3. Recalcular dívida.
4. Atualizar interface.
5. Atualizar histórico.
6. Atualizar status.

Não criar uma entidade financeira paralela para o pagamento se o sistema já utiliza TRANSACTION como mecanismo financeiro.

---

# EDIÇÃO DE TRANSAÇÃO

Se uma transação vinculada a uma dívida for editada:

Recalcular a dívida.

Exemplo:

Pagamento:
R$ 2.000

Alterado para:

R$ 1.000

A dívida deve recuperar R$ 1.000 no saldo.

---

# ALTERAÇÃO DE VÍNCULO

Se uma transação mudar:

Dívida A → Dívida B

deve:

1. Remover impacto da Dívida A.
2. Adicionar impacto na Dívida B.
3. Recalcular ambas.

Se debt_id virar NULL:

Remover o pagamento da dívida.

---

# EXCLUSÃO

Se uma transação vinculada for excluída:

Recalcular a dívida.

Exemplo:

Dívida:
R$ 5.000

Pagamento:
R$ 2.000

Saldo:
R$ 3.000

Excluir pagamento:

Saldo:
R$ 5.000

---

# PROTEÇÃO CONTRA PAGAMENTO EXCESSIVO

Se:

Saldo = R$ 3.000

e usuário informar:

Pagamento = R$ 4.000

bloquear por padrão.

Mostrar:

Saldo atual:
R$ 3.000

Pagamento:
R$ 4.000

Excedente:
R$ 1.000

Mensagem:

"Este pagamento é maior que o saldo atual da dívida."

Não permitir saldo negativo.

---

# STATUS

Utilizar:

- Em aberto
- Em negociação
- Parcelada
- Atrasada
- Quitada
- Cancelada

Quando saldo = 0:

status = Quitada

Registrar:

settled_at

Nunca excluir automaticamente uma dívida quitada.

---

# PÁGINA

Criar/implementar a página ou seção de Dívidas respeitando o layout já existente.

Header:

"Minhas Dívidas"

Descrição:

"Controle suas obrigações financeiras, pagamentos e oportunidades de quitação."

Botão:

"+ Nova dívida"

---

# KPIs

Exibir KPIs específicos do módulo:

- Quantidade de dívidas abertas
- Saldo devedor total
- Total pago
- Valor total de quitação à vista
- Economia potencial

IMPORTANTE:

Esses KPIs são exclusivos do módulo.

Não misturar automaticamente esses valores com os KPIs financeiros do Dashboard.

---

# FILTROS

Implementar:

- Status
- Responsável
- Credor
- Categoria
- Prioridade
- Vencimento
- Faixa de valor
- Com juros
- Parceladas
- Quitadas

Pesquisa:

- Nome
- Credor
- Descrição

---

# CARD

Cada dívida deve mostrar:

- Nome
- Credor
- Status
- Saldo
- Valor original
- Total pago
- Percentual quitado
- Vencimento
- Parcela estimada
- Juros
- Valor de quitação à vista

Ações:

- Detalhes
- Editar
- Registrar pagamento
- Arquivar
- Excluir

---

# DETALHES

Mostrar:

## Resumo

- Original
- Pago
- Saldo
- Quitação à vista
- Economia
- Percentual quitado

## Condições

- Credor
- Juros
- Multa
- Parcelamento
- Número de parcelas
- Valor estimado
- Vencimento

## Histórico

Listar todas as transações vinculadas.

Cada pagamento deve exibir:

- Data
- Valor
- Conta
- Descrição

Permitir abrir a transação original.

---

# FUNÇÃO CENTRAL

Criar:

recalculateDebt(debtId)

Essa função deve:

1. Buscar a dívida.
2. Buscar todas as transações vinculadas.
3. Considerar somente transações válidas.
4. Somar pagamentos.
5. Calcular saldo.
6. Calcular percentual.
7. Atualizar status.
8. Registrar quitação.
9. Atualizar interface.

Executar essa função quando:

- criar transação;
- editar transação;
- excluir transação;
- alterar vínculo;
- editar dívida;
- importar dados;
- restaurar backup.

---

# MODELO DE DADOS

Criar/ajustar entidade:

DEBT

Campos:

id
household_id
owner_id
created_by
name
creditor
description
responsible_user_id
visibility
category_id
original_amount
interest_rate
interest_type
has_interest
penalty_rate
has_penalty
installment_enabled
installment_count
installment_amount
start_date
due_date
lump_sum_settlement_amount
allows_early_payment
priority
status
notes
paid_amount
remaining_amount
paid_percentage
settled_at
created_at
updated_at

TRANSACTION:

Adicionar:

debt_id nullable

Criar relacionamento:

TRANSACTION.debt_id
→
DEBT.id

---

# PERMISSÕES

Respeitar completamente o sistema de usuários e household já existente.

O usuário somente poderá:

- visualizar dívidas autorizadas;
- editar dívidas autorizadas;
- registrar pagamentos autorizados;
- vincular transações a dívidas autorizadas.

Dívidas privadas não podem aparecer para outro membro sem autorização.

---

# AUDITORIA

Registrar eventos importantes:

- criação;
- edição;
- alteração de valores;
- alteração de juros;
- alteração de vencimento;
- pagamento vinculado;
- pagamento desvinculado;
- quitação;
- cancelamento;
- exclusão.

---

# ARQUITETURA

Não duplicar lógica.

O sistema deve possuir um único mecanismo financeiro:

TRANSACTION.

O módulo de Dívidas deve consumir essas transações para calcular suas obrigações.

Arquitetura:

TRANSACTION
↓
Pagamento real
↓
Categoria = Dívidas
↓
debt_id opcional
↓
DEBT
↓
Recalcular saldo

Nunca:

DEBT
↓
Criar automaticamente
↓
TRANSACTION

---

# QUALIDADE

Antes de finalizar, testar obrigatoriamente:

1. Criar dívida de R$ 5.000.
2. Confirmar que nenhuma transação foi criada.
3. Criar pagamento de R$ 2.000.
4. Confirmar saldo de R$ 3.000.
5. Criar pagamento de R$ 500.
6. Confirmar saldo de R$ 2.500.
7. Editar pagamento de R$ 500 para R$ 1.000.
8. Confirmar saldo de R$ 2.000.
9. Excluir o pagamento de R$ 1.000.
10. Confirmar saldo de R$ 3.000.
11. Criar pagamento final de R$ 3.000.
12. Confirmar saldo R$ 0.
13. Confirmar status QUITADA.
14. Confirmar que a dívida continua no histórico.
15. Criar despesa categoria "Dívidas" sem dívida vinculada.
16. Confirmar que a transação funciona normalmente.
17. Alterar uma transação da Dívida A para Dívida B.
18. Confirmar que ambas as dívidas foram recalculadas corretamente.
19. Tentar pagar mais que o saldo.
20. Confirmar bloqueio da operação.

---

# REGRA FINAL

Priorize consistência financeira sobre conveniência.

Não criar dados duplicados.

Não criar pagamentos paralelos às transações.

Não transformar automaticamente dívidas em despesas.

Não permitir que o saldo da dívida seja alterado manualmente de forma inconsistente.

A fonte da verdade financeira é a TRANSACTION.

A fonte da verdade das obrigações é a DEBT.

O relacionamento entre ambas é opcional e controlado por:

debt_id

Implementar o módulo sem alterar desnecessariamente as demais funcionalidades do sistema.