import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: number;
  suffix?: string;
  prefix?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'success' | 'warning' | 'destructive';
  animate?: boolean;
}

export function MetricCard({
  title,
  value,
  suffix = '',
  prefix = '',
  icon: Icon,
  trend,
  variant = 'default',
  animate = true,
}: MetricCardProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!animate) {
      setDisplayValue(value);
      return;
    }

    const duration = 1500;
    const steps = 60;
    const increment = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value, animate]);

  const variantStyles = {
    default: 'border-border',
    success: 'border-success/30 bg-success/5',
    warning: 'border-warning/30 bg-warning/5',
    destructive: 'border-destructive/30 bg-destructive/5',
  };

  const iconStyles = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-success/20 text-success',
    warning: 'bg-warning/20 text-warning',
    destructive: 'bg-destructive/20 text-destructive',
  };

  return (
    <Card className={cn('card-hover overflow-hidden', variantStyles[variant])}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-muted-foreground">{title}</p>
            <div className="mt-2 flex flex-wrap items-baseline gap-1">
              {prefix && <span className="text-base text-muted-foreground">{prefix}</span>}
              <span className="break-all text-2xl font-bold tracking-tight sm:text-3xl">
                {displayValue.toLocaleString()}
              </span>
              {suffix && <span className="text-xs text-muted-foreground sm:text-sm">{suffix}</span>}
            </div>
            {trend && (
              <div
                className={cn(
                  'mt-2 flex items-center text-xs sm:text-sm',
                  trend.isPositive ? 'text-success' : 'text-destructive'
                )}
              >
                <span>{trend.isPositive ? '?' : '?'} {Math.abs(trend.value)}%</span>
                <span className="ml-1 text-muted-foreground">vs last week</span>
              </div>
            )}
          </div>
          <div className={cn('shrink-0 rounded-lg p-2.5', iconStyles[variant])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
