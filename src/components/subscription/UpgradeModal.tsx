import { useState, createContext, useContext, ReactNode } from 'react';
import { Crown, Zap, Check, MessageSquare } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useSubscription, SubscriptionPlan } from '@/hooks/useSubscription';

interface UpgradeModalContextType {
  showUpgradeModal: (feature: string, requiredPlan?: SubscriptionPlan) => void;
  hideUpgradeModal: () => void;
}

const UpgradeModalContext = createContext<UpgradeModalContextType | undefined>(undefined);

interface UpgradeModalProviderProps {
  children: ReactNode;
}

const featureDetails: Record<string, {
  title: string;
  description: string;
  benefits: string[];
  requiredPlan: SubscriptionPlan;
}> = {
  'import': {
    title: 'Importação de Extratos',
    description: 'Importe automaticamente extratos bancários em PDF ou CSV para cadastrar transações rapidamente.',
    benefits: ['Importação de PDF e CSV', 'Detecção automática de duplicatas', 'Categorização inteligente'],
    requiredPlan: 'pro',
  },
  'ai-insights': {
    title: 'Insights com IA',
    description: 'Receba análises personalizadas e dicas para melhorar suas finanças baseadas em inteligência artificial.',
    benefits: ['Análise de gastos', 'Sugestões de economia', 'Previsões financeiras'],
    requiredPlan: 'pro',
  },
  'reminders': {
    title: 'Lembretes de Metas',
    description: 'Configure lembretes automáticos para não esquecer de contribuir para suas metas financeiras.',
    benefits: ['Lembretes automatizados', 'Frequência personalizável', 'Acompanhamento de progresso'],
    requiredPlan: 'pro',
  },
  'export': {
    title: 'Exportar Relatórios',
    description: 'Exporte relatórios detalhados em PDF para análise offline ou compartilhamento.',
    benefits: ['Relatórios em PDF', 'Gráficos inclusos', 'Período personalizável'],
    requiredPlan: 'pro',
  },
  'family': {
    title: 'Compartilhamento Familiar',
    description: 'Compartilhe e gerencie finanças com toda a família em um só lugar.',
    benefits: ['Grupos familiares', 'Contas compartilhadas', 'Visão consolidada'],
    requiredPlan: 'family',
  },
  'unlimited-accounts': {
    title: 'Contas Ilimitadas',
    description: 'Cadastre quantas contas bancárias precisar para ter controle total das suas finanças.',
    benefits: ['Sem limite de contas', 'Todos os bancos', 'Saldo consolidado'],
    requiredPlan: 'pro',
  },
  'unlimited-transactions': {
    title: 'Transações Ilimitadas',
    description: 'Registre todas as suas transações sem se preocupar com limites mensais.',
    benefits: ['Sem limite mensal', 'Histórico completo', 'Categorização automática'],
    requiredPlan: 'pro',
  },
  'unlimited-goals': {
    title: 'Metas Ilimitadas',
    description: 'Crie quantas metas financeiras precisar para alcançar todos os seus objetivos.',
    benefits: ['Metas ilimitadas', 'Acompanhamento visual', 'Previsões de conclusão'],
    requiredPlan: 'pro',
  },
  'unlimited-budgets': {
    title: 'Orçamentos Ilimitados',
    description: 'Defina orçamentos para todas as categorias e mantenha seus gastos sob controle.',
    benefits: ['Orçamentos por categoria', 'Alertas de limite', 'Histórico mensal'],
    requiredPlan: 'pro',
  },
};

const defaultFeature = {
  title: 'Recurso Premium',
  description: 'Este recurso está disponível apenas para assinantes dos planos pagos.',
  benefits: ['Acesso completo', 'Sem limitações', 'Suporte prioritário'],
  requiredPlan: 'pro' as SubscriptionPlan,
};

export function UpgradeModalProvider({ children }: UpgradeModalProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentFeature, setCurrentFeature] = useState<string>('');
  const [requiredPlanOverride, setRequiredPlanOverride] = useState<SubscriptionPlan | null>(null);
  const { getPlanLabel } = useSubscription();

  const showUpgradeModal = (feature: string, requiredPlan?: SubscriptionPlan) => {
    setCurrentFeature(feature);
    setRequiredPlanOverride(requiredPlan ?? null);
    setIsOpen(true);
  };

  const hideUpgradeModal = () => {
    setIsOpen(false);
    setCurrentFeature('');
    setRequiredPlanOverride(null);
  };

  const feature = featureDetails[currentFeature] || defaultFeature;
  const requiredPlan: SubscriptionPlan = requiredPlanOverride ?? feature.requiredPlan;

  return (
    <UpgradeModalContext.Provider value={{ showUpgradeModal, hideUpgradeModal }}>
      {children}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center">
            <div className="mx-auto p-3 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full w-fit mb-2">
              {requiredPlan === 'family' ? (
                <Zap className="h-8 w-8 text-white" />
              ) : (
                <Crown className="h-8 w-8 text-white" />
              )}
            </div>
            <DialogTitle className="text-xl">{feature.title}</DialogTitle>
            <DialogDescription className="text-base">
              {feature.description}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                O que você terá acesso:
              </h4>
              <ul className="space-y-2">
                {feature.benefits.map((benefit, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-background/60 border border-border rounded-lg p-4 text-sm space-y-1">
              <p className="text-muted-foreground">
                Este recurso está disponível no plano{' '}
                <strong className="text-foreground">{getPlanLabel(requiredPlan)}</strong>.
              </p>
              <p className="text-muted-foreground">
                A ativação de planos é gerenciada pela administração. Entre em contato
                solicitando o upgrade do seu plano.
              </p>
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              className="w-full gap-2"
              size="lg"
              onClick={hideUpgradeModal}
            >
              <MessageSquare className="h-4 w-4" />
              Entendi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </UpgradeModalContext.Provider>
  );
}

export function useUpgradeModal() {
  const context = useContext(UpgradeModalContext);
  if (context === undefined) {
    throw new Error('useUpgradeModal must be used within an UpgradeModalProvider');
  }
  return context;
}