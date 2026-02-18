import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FaultDetection } from '@/types/solar';
import { AlertTriangle, Clock, Thermometer, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface AlertCardProps {
  fault: FaultDetection;
  onDismiss?: (faultId: string) => void;
}

const severityStyles = {
  low: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
  high: 'bg-red-500/10 text-red-500 border-red-500/30',
  critical: 'bg-red-500/20 text-red-500 border-red-500/50 glow-destructive',
};

const severityBadgeStyles = {
  low: 'bg-blue-500 text-blue-500-foreground',
  medium: 'bg-yellow-500 text-yellow-500-foreground',
  high: 'bg-red-500 text-red-500-foreground',
  critical: 'bg-red-500 text-red-500-foreground animate-pulse',
};

export function AlertCard({ fault, onDismiss }: AlertCardProps) {
  return (
    <Card className={cn('overflow-hidden border-2', severityStyles[fault.severity])}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            <CardTitle className="text-base">{fault.faultType}</CardTitle>
          </div>
          <Badge className={severityBadgeStyles[fault.severity]}>
            {fault.severity.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="relative aspect-video overflow-hidden rounded-lg">
            <img
              src={fault.droneImageUrl}
              alt="Drone capture"
              className="h-full w-full object-cover"
            />
            <div className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 text-xs text-white">
              Visual
            </div>
          </div>
          <div className="relative aspect-video overflow-hidden rounded-lg">
            <img
              src={fault.thermalImageUrl}
              alt="Thermal image"
              className="h-full w-full object-cover"
            />
            <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded bg-black/70 px-2 py-1 text-xs text-white">
              <Thermometer className="h-3 w-3" />
              Thermal
            </div>
            {/* Fault location indicator */}
            <div
              className="absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full border-2 border-destructive bg-destructive/30"
              style={{ left: `${fault.location.x}%`, top: `${fault.location.y}%` }}
            />
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>Panel: {fault.panelId}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Detected {formatDistanceToNow(fault.detectedAt, { addSuffix: true })}</span>
          </div>
        </div>

        <div className="rounded-lg bg-muted p-3">
          <p className="text-xs font-medium text-muted-foreground">AI Analysis ({fault.aiConfidence.toFixed(1)}% confidence)</p>
          <p className="mt-1 text-sm line-clamp-2">{fault.aiAnalysis}</p>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            className="w-full"
            onClick={() => onDismiss?.(fault.id)}
          >
            Dismiss
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
