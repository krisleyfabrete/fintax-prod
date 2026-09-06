Escopo Funcional — Módulo de Dívidas
1. Visão Geral

O módulo de Dívidas será responsável pelo cadastro, acompanhamento e controle das obrigações financeiras do usuário.

A dívida será tratada como uma obrigação financeira independente, enquanto as Transações representam o dinheiro que efetivamente entrou ou saiu.

Princípio fundamental

Cadastrar uma dívida não gera uma transação.

Registrar uma transação de saída pode atualizar uma dívida quando houver vínculo entre as duas.

Exemplo:

Dívida cadastrada
R$ 5.000
        ↓
Pagamento real
R$ 2.000
        ↓
Transação de saída
Categoria: Dívidas
Dívida vinculada: Dívida X
        ↓
Saldo da dívida
R$ 3.000
2. Objetivos do Módulo

O módulo deve permitir:

cadastrar todas as dívidas;
controlar credores;
registrar valores originais;
controlar saldo devedor;
registrar pagamentos parciais;
controlar parcelamentos;
registrar juros e multas quando conhecidos;
informar valor de quitação à vista;
calcular economia potencial;
acompanhar vencimentos;
acompanhar evolução da quitação;
visualizar histórico de pagamentos;
vincular pagamentos às transações existentes;
separar dívidas individuais e compartilhadas;
manter histórico mesmo após a quitação.
3. Independência do Módulo

O módulo de Dívidas deve ser independente dos KPIs financeiros do Dashboard.

Os indicadores financeiros gerais não devem considerar simplesmente:

Dívida cadastrada = Despesa

Isso não deve acontecer.

Uma dívida cadastrada representa apenas uma obrigação.

Arquitetura
                    SISTEMA
                       │
             ┌─────────┴─────────┐
             │                   │
       MÓDULO FINANCEIRO     MÓDULO DÍVIDAS
             │                   │
       Transações             Obrigações
       Contas                 Credores
       Cartões                Saldo
       Receitas               Juros
       Despesas               Quitação
             │                   │
             └────────┬──────────┘
                      │
               VÍNCULO OPCIONAL
                      │
                  Transação
                      ↕
                    Dívida
Regra

A dívida pode ler transações vinculadas para atualizar seu saldo.

A dívida não deve criar automaticamente transações.

4. Cadastro de Dívida
Modal — Nova Dívida
Identificação
Nome da dívida
Credor
Descrição
Categoria
Responsável
Eu
Esposa
Nossa Casa
Visibilidade
Privada
Compartilhada
Casa
Valores
Valor original
Valor de quitação à vista
Juros
Multa
Outros encargos
Datas
Data de origem
Data de vencimento
Primeiro vencimento
Último vencimento, quando aplicável
Condições
Possui juros?
Taxa de juros
Tipo de juros
mensal
anual
fixo
desconhecido
Possui multa?
Permite parcelamento?
Quantidade de parcelas
Valor estimado da parcela
Permite antecipação?
Organização
Prioridade
Baixa
Média
Alta
Crítica
Observações
5. Valores Calculados

Os seguintes valores não devem ser editados manualmente após o cadastro:

total pago;
saldo devedor;
percentual quitado;
economia potencial.

Eles devem ser calculados pelo sistema.

Exemplo
Valor original: R$ 5.000

Pagamentos:
R$ 2.000
R$   500

Total pago:
R$ 2.500

Saldo:
R$ 2.500
6. Pagamentos Parciais

O sistema deve suportar pagamentos parciais ilimitados.

Exemplo
Dívida inicial
R$ 5.000

Pagamento 1
R$ 2.000
Saldo: R$ 3.000

Pagamento 2
R$ 500
Saldo: R$ 2.500

Pagamento 3
R$ 1.000
Saldo: R$ 1.500

Pagamento 4
R$ 1.500
Saldo: R$ 0

Ao atingir R$ 0:

Status = Quitada

A dívida deve permanecer armazenada para histórico.

7. Pagamento ≠ Parcelamento

Esses conceitos devem ser independentes.

Parcelamento

Representa uma condição acordada:

Dívida:
R$ 10.000

10 parcelas
R$ 1.000
Pagamento

Representa aquilo que realmente foi pago.

O usuário pode pagar:

Parcela prevista: R$ 1.000
Pagamento real: R$ 500

ou:

Parcela prevista: R$ 1.000
Pagamento real: R$ 1.500

O sistema deve controlar as duas informações separadamente.

8. Quitação à Vista

A dívida pode possuir uma condição especial de quitação.

Exemplo:

Saldo devedor: R$ 5.000

Quitação à vista:
R$ 3.800

O sistema calcula:

Economia potencial:
R$ 1.200

Desconto:
24%

Essa informação é apenas uma oportunidade até que o usuário realmente faça o pagamento.

O sistema não deve alterar o saldo automaticamente.

9. Integração com Transações

A entidade TRANSACTION deve possuir:

debt_id

O campo deve ser opcional.

Sem vínculo
TRANSACTION
debt_id = NULL

A transação funciona normalmente.

Com vínculo
TRANSACTION
debt_id = UUID_DA_DIVIDA

A transação passa a representar um pagamento daquela dívida.

10. Nova Despesa

No formulário Nova Despesa, adicionar:

Dívida vinculada

Esse campo deve aparecer quando:

Categoria = Dívidas

Opções:

Nenhuma
Dívida A
Dívida B
Dívida C
...

O campo é opcional.

Isso permite:

Categoria: Dívidas
Dívida: Nenhuma

ou:

Categoria: Dívidas
Dívida: Banco X
11. Registrar Pagamento

Dentro do detalhe de cada dívida haverá:

[ Registrar pagamento ]

O sistema deve abrir o formulário de transação já contextualizado.

Campos
Dívida
Valor
Conta de saída
Data
Descrição
Observação

Preenchimento automático:

Tipo = Despesa
Categoria = Dívidas
Dívida = Dívida atual

Ao confirmar:

Criar transação.
Vincular transação à dívida.
Recalcular total pago.
Recalcular saldo.
Recalcular percentual.
Atualizar status.
Atualizar histórico.
12. Alteração de Pagamentos

Se uma transação vinculada for editada, a dívida deve ser recalculada.

Exemplo

Antes:

Dívida: R$ 5.000
Pagamento: R$ 2.000
Saldo: R$ 3.000

Usuário altera o pagamento:

R$ 2.000 → R$ 1.000

Resultado:

Saldo:
R$ 4.000
13. Transferência de Vínculo

Se uma transação for transferida de uma dívida para outra:

Dívida A
- R$ 2.000

deve retirar esse valor da Dívida A.

Depois:

Dívida B
+ R$ 2.000 pagos

O sistema deve recalcular ambas.

14. Exclusão de Pagamento

Nunca excluir o pagamento diretamente do módulo de Dívidas.

O pagamento é uma transação.

Se a transação for excluída:

Dívida:
R$ 5.000

Pagamento:
R$ 2.000

Saldo:
R$ 3.000

Após excluir a transação:

Saldo:
R$ 5.000
15. Proteção contra Saldo Negativo

Exemplo:

Saldo atual:
R$ 3.000

Pagamento:
R$ 4.000

O sistema deve bloquear por padrão e informar:

"O valor informado é maior que o saldo atual desta dívida."

Exibir:

Saldo atual: R$ 3.000
Pagamento: R$ 4.000
Excedente: R$ 1.000

Posteriormente pode existir uma configuração para permitir pagamentos excedentes mediante confirmação.

16. KPIs do Módulo

Os KPIs da página de Dívidas pertencem exclusivamente ao módulo.

Total de dívidas

Quantidade de dívidas em aberto.

Saldo devedor

Soma dos saldos atuais.

Total pago

Soma dos pagamentos vinculados.

Quitação à vista

Soma dos valores de quitação à vista informados.

Economia potencial

Diferença entre:

Saldo devedor
-
Valor de quitação à vista

considerando somente dívidas com desconto informado.

17. Página de Dívidas
Header

Minhas Dívidas

Descrição:

Controle suas obrigações financeiras, pagamentos e oportunidades de quitação.

Ações:

+ Nova dívida
18. Filtros

Permitir filtrar por:

Status
Responsável
Credor
Categoria
Prioridade
Data de vencimento
Faixa de valor
Com juros
Parceladas
Quitadas

Pesquisa por:

Nome
Credor
Descrição
19. Card da Dívida

Cada dívida deve mostrar:

Nome da dívida
Credor

Status

Saldo devedor
R$ 4.500

Original
R$ 6.000

Pago
R$ 1.500

25% quitado

Vencimento
15/09/2026

Parcela
R$ 750

Juros
Sim

Quitação à vista
R$ 3.900

Ações:

Ver detalhes
Editar
Registrar pagamento
Arquivar
Excluir
20. Detalhes da Dívida
Resumo
Valor original
Total pago
Saldo devedor
Valor de quitação à vista
Economia potencial
Percentual quitado
Condições
Credor
Juros
Multa
Parcelamento
Quantidade de parcelas
Valor estimado da parcela
Vencimento
Histórico

Mostrar todas as transações vinculadas:

15/08/2026
Pagamento
R$ 1.000
Nubank

25/08/2026
Pagamento
R$ 500
Nubank

Cada item deve permitir abrir a transação original.

21. Status

Status possíveis:

Em aberto
Em negociação
Parcelada
Atrasada
Quitada
Cancelada
Regras

Saldo > 0 + vencimento futuro:

Em aberto

Saldo > 0 + parcelamento ativo:

Parcelada

Saldo > 0 + vencimento ultrapassado:

Atrasada

Saldo = 0:

Quitada
22. Quitação

Quando:

Saldo devedor = R$ 0

automaticamente:

Status = Quitada

Registrar:

settled_at

A dívida continua disponível no histórico.

23. Modelo de Dados
DEBT
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
TRANSACTION

Adicionar:

debt_id nullable

Relacionamento:

TRANSACTION.debt_id
        ↓
DEBT.id
24. Função Central

Criar:

recalculateDebt(debtId)

Responsabilidades:

Buscar dívida.
Buscar transações vinculadas.
Considerar apenas transações válidas.
Somar pagamentos.
Calcular saldo.
Calcular percentual.
Atualizar status.
Registrar quitação quando aplicável.
Atualizar interface.

Executar quando:

criar transação;
editar transação;
excluir transação;
alterar dívida;
alterar vínculo;
importar dados;
restaurar backup.
25. Auditoria

Registrar alterações importantes:

criação;
edição;
alteração de valores;
alteração de juros;
alteração de vencimento;
vínculo de pagamento;
remoção de pagamento;
quitação;
cancelamento.
26. Princípio Arquitetural Final

O sistema deve possuir um único mecanismo financeiro real: TRANSAÇÕES.

A dívida é uma camada de controle sobre essas transações.

DÍVIDA
   ↓
Obrigação financeira
   ↓
Não movimenta dinheiro


TRANSAÇÃO
   ↓
Dinheiro efetivamente saiu
   ↓
Categoria = Dívidas
   ↓
Dívida vinculada opcionalmente
   ↓
Atualiza saldo da dívida