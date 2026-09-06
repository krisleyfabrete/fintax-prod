import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, TrendingUp, Building2, Briefcase, LineChart, Calculator } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { UpgradePrompt } from '@/components/subscription/UpgradePrompt';
import { useInvestments, Investment, InvestmentFormData } from '@/hooks/useInvestments';
import { useBrokers, Broker, BrokerFormData } from '@/hooks/useBrokers';
import { usePortfolios, Portfolio, PortfolioFormData } from '@/hooks/usePortfolios';
import { InvestmentSummary } from '@/components/investments/InvestmentSummary';
import { InvestmentChart } from '@/components/investments/InvestmentChart';
import { InvestmentCard } from '@/components/investments/InvestmentCard';
import { InvestmentDialog } from '@/components/investments/InvestmentDialog';
import { BrokerCard } from '@/components/investments/BrokerCard';
import { BrokerDialog } from '@/components/investments/BrokerDialog';
import { PortfolioCard } from '@/components/investments/PortfolioCard';
import { PortfolioDialog } from '@/components/investments/PortfolioDialog';
import { QuoteUpdater } from '@/components/investments/QuoteUpdater';
import { PatrimonyChart } from '@/components/investments/PatrimonyChart';
import { TaxCalculator } from '@/components/investments/TaxCalculator';
import { Skeleton } from '@/components/ui/skeleton';

export default function Investments() {
  const { isPro, isLoading: isLoadingSubscription } = useSubscription();
  const {
    investments,
    isLoading: isLoadingInvestments,
    createInvestment,
    updateInvestment,
    deleteInvestment,
    totalInvested,
    totalCurrentValue,
    totalProfit,
    profitPercentage,
    distributionByType,
  } = useInvestments();
  const { brokers, isLoading: isLoadingBrokers, createBroker, updateBroker, deleteBroker } = useBrokers();
  const { portfolios, isLoading: isLoadingPortfolios, createPortfolio, updatePortfolio, deletePortfolio } = usePortfolios();

  const [investmentDialogOpen, setInvestmentDialogOpen] = useState(false);
  const [brokerDialogOpen, setBrokerDialogOpen] = useState(false);
  const [portfolioDialogOpen, setPortfolioDialogOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [editingBroker, setEditingBroker] = useState<Broker | null>(null);
  const [editingPortfolio, setEditingPortfolio] = useState<Portfolio | null>(null);

  const isLoading = isLoadingSubscription || isLoadingInvestments || isLoadingBrokers || isLoadingPortfolios;

  // Verificar acesso ao recurso
  if (!isLoadingSubscription && !isPro) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Investimentos</h1>
              <p className="text-muted-foreground">
                Gerencie sua carteira de investimentos
              </p>
            </div>
          </div>
          <UpgradePrompt
            feature="Investimentos"
            description="Gerencie sua carteira de investimentos, acompanhe rendimentos e organize seus ativos por corretora."
            requiredPlan="pro"
            variant="card"
          />
        </div>
      </AppLayout>
    );
  }

  const handleCreateInvestment = (data: InvestmentFormData) => {
    createInvestment.mutate(data, {
      onSuccess: () => setInvestmentDialogOpen(false),
    });
  };

  const handleUpdateInvestment = (data: InvestmentFormData) => {
    if (editingInvestment) {
      updateInvestment.mutate({ id: editingInvestment.id, ...data }, {
        onSuccess: () => {
          setInvestmentDialogOpen(false);
          setEditingInvestment(null);
        },
      });
    }
  };

  const handleCreateBroker = (data: BrokerFormData) => {
    createBroker.mutate(data, {
      onSuccess: () => setBrokerDialogOpen(false),
    });
  };

  const handleUpdateBroker = (data: BrokerFormData) => {
    if (editingBroker) {
      updateBroker.mutate({ id: editingBroker.id, ...data }, {
        onSuccess: () => {
          setBrokerDialogOpen(false);
          setEditingBroker(null);
        },
      });
    }
  };

  const handleCreatePortfolio = (data: PortfolioFormData) => {
    createPortfolio.mutate(data, {
      onSuccess: () => setPortfolioDialogOpen(false),
    });
  };

  const handleUpdatePortfolio = (data: PortfolioFormData) => {
    if (editingPortfolio) {
      updatePortfolio.mutate({ id: editingPortfolio.id, ...data }, {
        onSuccess: () => {
          setPortfolioDialogOpen(false);
          setEditingPortfolio(null);
        },
      });
    }
  };

  // Calcular valores por corretora
  const getBrokerStats = (brokerId: string) => {
    const brokerPortfolios = portfolios.filter(p => p.broker_id === brokerId);
    const portfolioIds = brokerPortfolios.map(p => p.id);
    const brokerInvestments = investments.filter(i => i.portfolio_id && portfolioIds.includes(i.portfolio_id));
    const totalValue = brokerInvestments.reduce((sum, i) => sum + (i.quantity * i.current_price), 0);
    return { portfolioCount: brokerPortfolios.length, totalValue };
  };

  // Calcular valores por carteira
  const getPortfolioStats = (portfolioId: string) => {
    const portfolioInvestments = investments.filter(i => i.portfolio_id === portfolioId);
    const totalValue = portfolioInvestments.reduce((sum, i) => sum + (i.quantity * i.current_price), 0);
    return { investmentCount: portfolioInvestments.length, totalValue };
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Investimentos</h1>
              <p className="text-muted-foreground">
                Gerencie sua carteira de investimentos
              </p>
            </div>
          </div>
          <QuoteUpdater investments={investments} />
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
            <Skeleton className="h-[300px]" />
          </div>
        ) : (
          <>
            <InvestmentSummary
              totalInvested={totalInvested}
              totalCurrentValue={totalCurrentValue}
              totalProfit={totalProfit}
              profitPercentage={profitPercentage}
            />

            <Tabs defaultValue="investments" className="space-y-4">
              <TabsList className="flex-wrap">
                <TabsTrigger value="investments" className="gap-2">
                  <LineChart className="h-4 w-4" />
                  Ativos
                </TabsTrigger>
                <TabsTrigger value="evolution" className="gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Evolução
                </TabsTrigger>
                <TabsTrigger value="tax" className="gap-2">
                  <Calculator className="h-4 w-4" />
                  IR
                </TabsTrigger>
                <TabsTrigger value="portfolios" className="gap-2">
                  <Briefcase className="h-4 w-4" />
                  Carteiras
                </TabsTrigger>
                <TabsTrigger value="brokers" className="gap-2">
                  <Building2 className="h-4 w-4" />
                  Corretoras
                </TabsTrigger>
              </TabsList>

              <TabsContent value="investments" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Meus Ativos</h2>
                  <Button onClick={() => {
                    setEditingInvestment(null);
                    setInvestmentDialogOpen(true);
                  }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Ativo
                  </Button>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <InvestmentChart distributionByType={distributionByType} />
                  
                  <div className="space-y-3">
                    {investments.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Nenhum investimento cadastrado. Clique em "Novo Ativo" para começar.
                      </div>
                    ) : (
                      investments.map((investment) => (
                        <InvestmentCard
                          key={investment.id}
                          investment={investment}
                          onEdit={() => {
                            setEditingInvestment(investment);
                            setInvestmentDialogOpen(true);
                          }}
                          onDelete={() => deleteInvestment.mutate(investment.id)}
                        />
                      ))
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="evolution" className="space-y-4">
                <PatrimonyChart 
                  investments={investments}
                  totalCurrentValue={totalCurrentValue}
                  totalInvested={totalInvested}
                />
              </TabsContent>

              <TabsContent value="tax" className="space-y-4">
                <TaxCalculator investments={investments} />
              </TabsContent>

              <TabsContent value="portfolios" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Minhas Carteiras</h2>
                  <Button onClick={() => {
                    setEditingPortfolio(null);
                    setPortfolioDialogOpen(true);
                  }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Carteira
                  </Button>
                </div>

                {portfolios.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma carteira cadastrada. Clique em "Nova Carteira" para começar.
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {portfolios.map((portfolio) => {
                      const stats = getPortfolioStats(portfolio.id);
                      return (
                        <PortfolioCard
                          key={portfolio.id}
                          portfolio={portfolio}
                          investmentCount={stats.investmentCount}
                          totalValue={stats.totalValue}
                          onEdit={() => {
                            setEditingPortfolio(portfolio);
                            setPortfolioDialogOpen(true);
                          }}
                          onDelete={() => deletePortfolio.mutate(portfolio.id)}
                        />
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="brokers" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Minhas Corretoras</h2>
                  <Button onClick={() => {
                    setEditingBroker(null);
                    setBrokerDialogOpen(true);
                  }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Corretora
                  </Button>
                </div>

                {brokers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma corretora cadastrada. Clique em "Nova Corretora" para começar.
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {brokers.map((broker) => {
                      const stats = getBrokerStats(broker.id);
                      return (
                        <BrokerCard
                          key={broker.id}
                          broker={broker}
                          portfolioCount={stats.portfolioCount}
                          totalValue={stats.totalValue}
                          onEdit={() => {
                            setEditingBroker(broker);
                            setBrokerDialogOpen(true);
                          }}
                          onDelete={() => deleteBroker.mutate(broker.id)}
                        />
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}

        <InvestmentDialog
          open={investmentDialogOpen}
          onOpenChange={(open) => {
            setInvestmentDialogOpen(open);
            if (!open) setEditingInvestment(null);
          }}
          investment={editingInvestment}
          portfolios={portfolios}
          onSubmit={editingInvestment ? handleUpdateInvestment : handleCreateInvestment}
          isLoading={createInvestment.isPending || updateInvestment.isPending}
        />

        <BrokerDialog
          open={brokerDialogOpen}
          onOpenChange={(open) => {
            setBrokerDialogOpen(open);
            if (!open) setEditingBroker(null);
          }}
          broker={editingBroker}
          onSubmit={editingBroker ? handleUpdateBroker : handleCreateBroker}
          isLoading={createBroker.isPending || updateBroker.isPending}
        />

        <PortfolioDialog
          open={portfolioDialogOpen}
          onOpenChange={(open) => {
            setPortfolioDialogOpen(open);
            if (!open) setEditingPortfolio(null);
          }}
          portfolio={editingPortfolio}
          brokers={brokers}
          onSubmit={editingPortfolio ? handleUpdatePortfolio : handleCreatePortfolio}
          isLoading={createPortfolio.isPending || updatePortfolio.isPending}
        />
      </div>
    </AppLayout>
  );
}
