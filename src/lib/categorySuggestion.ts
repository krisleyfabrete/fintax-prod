// Padrões de texto para sugestão automática de categoria
// Os padrões são case-insensitive e usam regex

interface CategoryPattern {
  categoryName: string;
  patterns: RegExp[];
}

// Padrões para despesas
const expensePatterns: CategoryPattern[] = [
  {
    categoryName: 'Alimentação',
    patterns: [
      /restaurante/i,
      /lanchonete/i,
      /pizzaria/i,
      /ifood/i,
      /uber\s*eats/i,
      /rappi/i,
      /mercado/i,
      /supermercado/i,
      /padaria/i,
      /açougue/i,
      /hortifruti/i,
      /café/i,
      /coffee/i,
      /almoço/i,
      /jantar/i,
      /lanche/i,
      /comida/i,
      /delivery/i,
      /mcdonald/i,
      /burger/i,
      /hamburguer/i,
      /sushi/i,
      /churrascaria/i,
    ],
  },
  {
    categoryName: 'Transporte',
    patterns: [
      /uber/i,
      /99/i,
      /táxi/i,
      /taxi/i,
      /combustível/i,
      /combustivel/i,
      /gasolina/i,
      /álcool/i,
      /alcool/i,
      /diesel/i,
      /estacionamento/i,
      /pedágio/i,
      /pedagio/i,
      /passagem/i,
      /ônibus/i,
      /onibus/i,
      /metrô/i,
      /metro/i,
      /bilhete/i,
      /transporte/i,
      /posto/i,
      /ipva/i,
      /licenciamento/i,
      /seguro\s*auto/i,
    ],
  },
  {
    categoryName: 'Moradia',
    patterns: [
      /aluguel/i,
      /condomínio/i,
      /condominio/i,
      /iptu/i,
      /luz/i,
      /energia/i,
      /eletricidade/i,
      /água/i,
      /agua/i,
      /saneamento/i,
      /gás/i,
      /gas/i,
      /internet/i,
      /wifi/i,
      /telefone/i,
      /celular/i,
      /manutenção/i,
      /manutencao/i,
      /reforma/i,
      /móveis/i,
      /moveis/i,
      /eletrodoméstico/i,
      /eletrodomestico/i,
    ],
  },
  {
    categoryName: 'Saúde',
    patterns: [
      /farmácia/i,
      /farmacia/i,
      /remédio/i,
      /remedio/i,
      /medicamento/i,
      /médico/i,
      /medico/i,
      /consulta/i,
      /exame/i,
      /laboratório/i,
      /laboratorio/i,
      /hospital/i,
      /clínica/i,
      /clinica/i,
      /dentista/i,
      /plano\s*de\s*saúde/i,
      /plano\s*de\s*saude/i,
      /unimed/i,
      /bradesco\s*saúde/i,
      /amil/i,
      /óculos/i,
      /oculos/i,
      /psicólogo/i,
      /psicologo/i,
      /terapia/i,
      /fisioterapia/i,
    ],
  },
  {
    categoryName: 'Educação',
    patterns: [
      /escola/i,
      /faculdade/i,
      /universidade/i,
      /curso/i,
      /mensalidade/i,
      /matrícula/i,
      /matricula/i,
      /livro/i,
      /material\s*escolar/i,
      /apostila/i,
      /udemy/i,
      /alura/i,
      /coursera/i,
      /inglês/i,
      /ingles/i,
      /idioma/i,
      /ensino/i,
      /aula/i,
      /treinamento/i,
    ],
  },
  {
    categoryName: 'Lazer',
    patterns: [
      /cinema/i,
      /teatro/i,
      /show/i,
      /ingresso/i,
      /netflix/i,
      /spotify/i,
      /amazon\s*prime/i,
      /disney/i,
      /hbo/i,
      /streaming/i,
      /jogo/i,
      /game/i,
      /playstation/i,
      /xbox/i,
      /nintendo/i,
      /viagem/i,
      /hotel/i,
      /pousada/i,
      /airbnb/i,
      /passeio/i,
      /parque/i,
      /clube/i,
      /academia/i,
      /gym/i,
      /esporte/i,
      /bar/i,
      /balada/i,
      /festa/i,
    ],
  },
  {
    categoryName: 'Vestuário',
    patterns: [
      /roupa/i,
      /calçado/i,
      /calcado/i,
      /sapato/i,
      /tênis/i,
      /tenis/i,
      /camisa/i,
      /camiseta/i,
      /calça/i,
      /calca/i,
      /vestido/i,
      /blusa/i,
      /jaqueta/i,
      /casaco/i,
      /renner/i,
      /riachuelo/i,
      /c&a/i,
      /zara/i,
      /shein/i,
      /shopee/i,
      /acessório/i,
      /acessorio/i,
      /bolsa/i,
      /mochila/i,
    ],
  },
  {
    categoryName: 'Serviços',
    patterns: [
      /cabeleireiro/i,
      /salão/i,
      /salao/i,
      /barbearia/i,
      /manicure/i,
      /pedicure/i,
      /limpeza/i,
      /diarista/i,
      /faxina/i,
      /lavanderia/i,
      /costura/i,
      /conserto/i,
      /reparo/i,
      /encanador/i,
      /eletricista/i,
      /pedreiro/i,
      /advogado/i,
      /contador/i,
      /cartório/i,
      /cartorio/i,
    ],
  },
  {
    categoryName: 'Compras',
    patterns: [
      /amazon/i,
      /mercado\s*livre/i,
      /magazine/i,
      /magalu/i,
      /americanas/i,
      /casas\s*bahia/i,
      /ponto\s*frio/i,
      /extra/i,
      /carrefour/i,
      /walmart/i,
      /compra/i,
      /presente/i,
      /eletrônico/i,
      /eletronico/i,
      /celular/i,
      /smartphone/i,
      /notebook/i,
      /computador/i,
    ],
  },
  {
    categoryName: 'Outros',
    patterns: [
      /taxa/i,
      /tarifa/i,
      /multa/i,
      /doação/i,
      /doacao/i,
      /contribuição/i,
      /contribuicao/i,
    ],
  },
];

// Padrões para receitas
const incomePatterns: CategoryPattern[] = [
  {
    categoryName: 'Salário',
    patterns: [
      /salário/i,
      /salario/i,
      /pagamento/i,
      /folha/i,
      /holerite/i,
      /contracheque/i,
      /remuneração/i,
      /remuneracao/i,
      /ordenado/i,
      /pro-?labore/i,
      /décimo/i,
      /decimo/i,
      /13°/i,
      /férias/i,
      /ferias/i,
    ],
  },
  {
    categoryName: 'Freelance',
    patterns: [
      /freelance/i,
      /freela/i,
      /projeto/i,
      /consultoria/i,
      /serviço\s*prestado/i,
      /servico\s*prestado/i,
      /trabalho\s*extra/i,
      /bico/i,
      /job/i,
      /cliente/i,
      /nota\s*fiscal/i,
      /nf/i,
    ],
  },
  {
    categoryName: 'Investimentos',
    patterns: [
      /investimento/i,
      /dividendo/i,
      /rendimento/i,
      /juros/i,
      /ação/i,
      /acao/i,
      /fundo/i,
      /cdb/i,
      /lci/i,
      /lca/i,
      /tesouro/i,
      /poupança/i,
      /poupanca/i,
      /resgate/i,
      /lucro/i,
      /retorno/i,
    ],
  },
  {
    categoryName: 'Vendas',
    patterns: [
      /venda/i,
      /vendido/i,
      /olx/i,
      /marketplace/i,
      /mercado\s*livre/i,
      /loja/i,
      /produto/i,
      /mercadoria/i,
      /comissão/i,
      /comissao/i,
    ],
  },
  {
    categoryName: 'Outros',
    patterns: [
      /reembolso/i,
      /devolução/i,
      /devolucao/i,
      /estorno/i,
      /presente/i,
      /prêmio/i,
      /premio/i,
      /sorteio/i,
      /bônus/i,
      /bonus/i,
      /cashback/i,
    ],
  },
];

export interface CategorySuggestion {
  categoryName: string;
  confidence: number;
}

/**
 * Sugere uma categoria baseada na descrição da transação
 * @param description - Descrição da transação
 * @param type - Tipo da transação (income ou expense)
 * @returns Sugestão de categoria ou null se nenhum padrão for encontrado
 */
export function suggestCategory(
  description: string,
  type: 'income' | 'expense'
): CategorySuggestion | null {
  if (!description || description.trim().length < 2) {
    return null;
  }

  const patterns = type === 'expense' ? expensePatterns : incomePatterns;
  
  for (const categoryPattern of patterns) {
    for (const pattern of categoryPattern.patterns) {
      if (pattern.test(description)) {
        return {
          categoryName: categoryPattern.categoryName,
          confidence: 0.9,
        };
      }
    }
  }

  return null;
}

/**
 * Encontra o ID da categoria baseado no nome
 * @param categoryName - Nome da categoria
 * @param categories - Lista de categorias disponíveis
 * @param type - Tipo da transação
 * @returns ID da categoria ou null se não encontrar
 */
export function findCategoryIdByName(
  categoryName: string,
  categories: Array<{ id: string; name: string; type: string }>,
  type: 'income' | 'expense'
): string | null {
  const category = categories.find(
    (c) => c.name.toLowerCase() === categoryName.toLowerCase() && c.type === type
  );
  return category?.id || null;
}
