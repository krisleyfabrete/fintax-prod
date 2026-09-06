import { useMemo } from 'react';
import { Trophy, Medal, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Goal } from '@/hooks/useGoals';

interface Transaction {
  id: string;
  amount: number;
  date: string;
  type: 'income' | 'expense';
  status: string;
  category_id: string | null;
}

interface GoalRankingProps {
  goals: Goal[];
  transactions: Transaction[];
}

interface RankedGoal {
  goal: Goal;
  currentAmount: number;
  percentage: number;
  performance: 'excellent' | 'good' | 'average' | 'poor';
}

export function GoalRanking({ goals, transactions }: GoalRankingProps) {
  const activeGoals = goals.filter((g) => g.is_active);

  const rankedGoals = useMemo(() => {
    if (activeGoals.length === 0) return [];

    const goalsWithProgress: RankedGoal[] = activeGoals.map((goal) => {
      const relevantTransactions = transactions.filter(
        (t) => t.category_id === goal.category_id && t.status === 'confirmed'
      );
      const currentAmount = relevantTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
      
      // For limit goals, lower percentage is better; for savings, higher is better
      const percentage = goal.target_amount > 0 ? (currentAmount / goal.target_amount) * 100 : 0;
      
      // Calculate performance score
      let performance: 'excellent' | 'good' | 'average' | 'poor';
      if (goal.goal_type === 'limit') {
        // For limits: lower is better
        if (percentage <= 50) performance = 'excellent';
        else if (percentage <= 75) performance = 'good';
        else if (percentage <= 100) performance = 'average';
        else performance = 'poor';
      } else {
        // For savings: higher is better
        if (percentage >= 100) performance = 'excellent';
        else if (percentage >= 75) performance = 'good';
        else if (percentage >= 50) performance = 'average';
        else performance = 'poor';
      }

      return {
        goal,
        currentAmount,
        percentage,
        performance,
      };
    });

    // Sort by performance (excellent first) then by percentage
    return goalsWithProgress.sort((a, b) => {
      const performanceOrder = { excellent: 0, good: 1, average: 2, poor: 3 };
      const aScore = performanceOrder[a.performance];
      const bScore = performanceOrder[b.performance];
      
      if (aScore !== bScore) return aScore - bScore;
      
      // For same performance tier, sort by actual progress
      if (a.goal.goal_type === 'limit') {
        return a.percentage - b.percentage; // Lower is better for limits
      }
      return b.percentage - a.percentage; // Higher is better for savings
    });
  }, [activeGoals, transactions]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  if (rankedGoals.length === 0) {
    return null;
  }

  const getPerformanceConfig = (performance: string, goalType: string) => {
    const isLimit = goalType === 'limit';
    switch (performance) {
      case 'excellent':
        return { 
          color: 'text-green-500', 
          bgColor: 'bg-green-500/10',
          label: isLimit ? 'Excelente controle' : 'Meta atingida',
          icon: TrendingUp 
        };
      case 'good':
        return { 
          color: 'text-blue-500', 
          bgColor: 'bg-blue-500/10',
          label: isLimit ? 'Bom controle' : 'Bom progresso',
          icon: TrendingUp 
        };
      case 'average':
        return { 
          color: 'text-yellow-500', 
          bgColor: 'bg-yellow-500/10',
          label: isLimit ? 'Atenção' : 'Progresso moderado',
          icon: TrendingDown 
        };
      default:
        return { 
          color: 'text-red-500', 
          bgColor: 'bg-red-500/10',
          label: isLimit ? 'Limite excedido' : 'Precisa acelerar',
          icon: TrendingDown 
        };
    }
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 1:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 2:
        return <Medal className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-sm text-muted-foreground font-medium">{index + 1}</span>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Ranking de Desempenho
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {rankedGoals.map((item, index) => {
            const config = getPerformanceConfig(item.performance, item.goal.goal_type);
            const Icon = config.icon;
            
            return (
              <div
                key={item.goal.id}
                className={`p-3 rounded-lg border ${index === 0 ? 'border-yellow-500/50 bg-yellow-500/5' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {getRankIcon(index)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {item.goal.category && (
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: item.goal.category.color }}
                        />
                      )}
                      <span className="font-medium truncate">{item.goal.name}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatCurrency(item.currentAmount)} / {formatCurrency(item.goal.target_amount)}</span>
                      <span>•</span>
                      <span>{item.percentage.toFixed(0)}%</span>
                    </div>
                    
                    <Progress 
                      value={Math.min(item.percentage, 100)} 
                      className="h-1.5 mt-2" 
                    />
                  </div>
                  
                  <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${config.bgColor} ${config.color}`}>
                    <Icon className="h-3 w-3" />
                    <span className="hidden sm:inline">{config.label}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        <p className="text-xs text-muted-foreground text-center mt-4">
          Ranking baseado no desempenho relativo à meta definida
        </p>
      </CardContent>
    </Card>
  );
}
