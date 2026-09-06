import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: LucideIcon;
  gradient: string;
  index?: number;
  href?: string;
}

export function StatCard({ title, value, change, trend, icon: Icon, gradient, index = 0, href }: StatCardProps) {
  const cardContent = (
    <Card 
      className={cn(
        "border-0 overflow-hidden animate-fade-in relative h-full",
        "bg-card/50 backdrop-blur-sm",
        "shadow-card hover:shadow-neon transition-all duration-500",
        "before:absolute before:inset-0 before:rounded-lg before:p-[1px]",
        "before:bg-gradient-to-br before:from-primary/30 before:via-transparent before:to-secondary/30",
        "before:-z-10 before:opacity-0 hover:before:opacity-100 before:transition-opacity",
        href && "hover:scale-[1.02] active:scale-[0.98]"
      )}
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 rounded-lg" />
      <CardHeader className="flex flex-row items-center justify-between pb-2 relative p-3 sm:p-6 sm:pb-2">
        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn(
          "p-1.5 sm:p-2 rounded-lg shadow-neon animate-glow",
          gradient
        )}>
          <Icon className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
        </div>
      </CardHeader>
      <CardContent className="relative p-3 pt-0 sm:p-6 sm:pt-0">
        <div className="text-lg sm:text-2xl font-bold text-gradient truncate">{value}</div>
        {change && (
          <div className="flex items-center gap-1 mt-1">
            {trend === 'up' && (
              <ArrowUpRight className="h-3 w-3 sm:h-4 sm:w-4 text-income" />
            )}
            {trend === 'down' && (
              <ArrowDownRight className="h-3 w-3 sm:h-4 sm:w-4 text-expense" />
            )}
            <span className={`text-xs sm:text-sm ${
              trend === 'up' ? 'text-income' : 
              trend === 'down' ? 'text-expense' : 
              'text-muted-foreground'
            }`}>
              {change}
            </span>
          </div>
        )}
        </CardContent>
      </Card>
    );

  if (href) {
    return (
      <Link to={href} className="block">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}
