import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/types/solar';
import { AlertTriangle, MapPin, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface AlertCardProps {
  alert: Alert;
  onDismiss?: (alertId: string) => void;
}

const statusStyles = {
  warning: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
  fault: 'bg-red-500/10 text-red-500 border-red-500/30',
};

const statusBadgeStyles = {
  warning: 'bg-yellow-500 text-white',
  fault: 'bg-red-500 text-white',
};

export function AlertCard({ alert, onDismiss }: AlertCardProps) {
  const normalizedStatus = (() => {
    const value = String(alert.status ?? '').trim().toLowerCase();
    if (value === 'warning') return 'warning';
    if (value === 'fault' || value === 'critical' || value === 'error') return 'fault';
    return 'warning';
  })();

  // Display the alert ID in ALT-XXX format
  const displayAlertId = alert.alertId || `ALT-${alert.id.slice(0, 3)}`;

  return (
    <Card className={cn('overflow-hidden border-2', statusStyles[normalizedStatus])}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            <CardTitle className="text-base">
              {normalizedStatus === 'fault' ? 'Fault Alert' : 'Warning Alert'}
            </CardTitle>
          </div>
          <Badge className={statusBadgeStyles[normalizedStatus]}>
            {normalizedStatus === 'fault' ? 'FAULT' : 'WARNING'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>Zone: {alert.zone} - Row: {alert.row}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="font-medium">Alert ID:</span>
            <span className="font-mono">{displayAlertId}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Triggered {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}</span>
          </div>
        </div>

        {alert.message && (
          <div className="rounded-lg bg-muted p-3">
            <p className="text-sm">{alert.message}</p>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            size="sm"
            className="w-full"
            onClick={() => onDismiss?.(alert.id)}
          >
            Dismiss
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
