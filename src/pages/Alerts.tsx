import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { AlertCard } from '@/components/dashboard/AlertCard';
import type { Alert } from '@/types/solar';

// Types matching PanelGrid API response
interface PanelData {
    id: string;
    panelId: string;
    row: number;
    column: number;
    zone: { id: string; name: string };
    zoneId: string;
    status: 'healthy' | 'warning' | 'fault' | 'offline';
    efficiency: number;
    currentOutput: number;
    maxOutput: number;
    temperature: number;
    lastChecked: string;
    installDate: string;
    inverterGroup: string;
    stringId: string;
    sensorDeviceId?: string | null;
    sensorLastUpdated?: string | null;
    sensorVoltage?: number | null;
    sensorCurrentMa?: number | null;
    sensorPowerMw?: number | null;
}

// Voltage-based status calculation (same as PanelGrid)
// <10V = fault (red), 11-15V = warning (yellow), >15V = healthy (green)
const getVoltageStatus = (voltage: number): 'healthy' | 'warning' | 'fault' | 'offline' => {
    if (voltage < 10) return 'fault';
    if (voltage >= 11 && voltage <= 15) return 'warning';
    return 'healthy';
};

// Compute row status from panels (same logic as PanelGrid)
const computeRowStatusFromPanels = (rowPanels: PanelData[]): { status: 'healthy' | 'warning' | 'fault' | 'offline'; avgVoltage: number } => {
    const sortedPanels = [...rowPanels].sort((a, b) => a.column - b.column);
    const devicePanel = sortedPanels.find((panel) => panel.sensorDeviceId);
    const avgVoltage = Number(devicePanel?.sensorVoltage || 0);
    const allOffline = sortedPanels.every((panel) => panel.status === 'offline');
    if (allOffline) return { status: 'offline', avgVoltage };
    return { status: getVoltageStatus(avgVoltage), avgVoltage };
};

// Build a map of row key to status based on PanelGrid data
const normalizeZone = (zone: string) => zone.trim().toLowerCase().replace(/^zone\s*/i, '');

const buildRowStatusMapFromPanels = (
    panels: PanelData[]
): Map<string, { status: 'healthy' | 'warning' | 'fault' | 'offline'; avgVoltage: number }> => {
    const groupedByRow = new Map<string, PanelData[]>();
    
    // Group panels by zone-row
    panels.forEach((panel) => {
        const rowKey = `${normalizeZone(panel.zone?.name || 'unknown')}-${panel.row}`;
        if (!groupedByRow.has(rowKey)) groupedByRow.set(rowKey, []);
        groupedByRow.get(rowKey)!.push(panel);
    });

    const statusByRow = new Map<string, { status: 'healthy' | 'warning' | 'fault' | 'offline'; avgVoltage: number }>();
    
    // Calculate status for each row based on voltage
    groupedByRow.forEach((rowPanels, rowKey) => {
        const { status, avgVoltage } = computeRowStatusFromPanels(rowPanels);
        statusByRow.set(rowKey, { status, avgVoltage });
    });

    return statusByRow;
};

export default function Alerts() {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchAlerts() {
            try {
                const [alertsRes, panelsRes] = await Promise.all([
                    fetch('/api/alerts'),
                    fetch('/api/panels'),
                ]);

                if (alertsRes.ok) {
                    const data = await alertsRes.json();
                    const panels = panelsRes.ok ? ((await panelsRes.json()) as PanelData[]) : [];
                    
                    // Build row status map from PanelGrid data (voltage-based)
                    const rowStatusMap = buildRowStatusMapFromPanels(Array.isArray(panels) ? panels : []);

                    const transformed = data
                        .map((alert: any) => {
                            const key = `${normalizeZone(String(alert.zone || 'unknown'))}-${alert.row}`;
                            const panelGridData = rowStatusMap.get(key);
                            const panelStatus = panelGridData?.status;

                            // Use panel-grid row status as source of truth.
                            // If row is healthy/offline/missing, this alert should not remain active.
                            if (panelStatus !== 'warning' && panelStatus !== 'fault') {
                                fetch('/api/alerts/dismiss', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ zone: alert.zone, row: alert.row }),
                                }).catch((err) => console.error('Failed to dismiss non-actionable alert:', err));
                                return null;
                            }

                            return {
                                ...alert,
                                status: panelStatus,
                                createdAt: new Date(alert.createdAt),
                            };
                        })
                        .filter((alert: any) => Boolean(alert));

                    setAlerts(transformed);
                }
            } catch (err) {
                console.warn('API unavailable, showing empty alerts');
            } finally {
                setLoading(false);
            }
        }

        fetchAlerts();
        const intervalId = window.setInterval(fetchAlerts, 5000);
        return () => {
            window.clearInterval(intervalId);
        };
    }, []);

    const handleDismiss = async (alertId: string) => {
        try {
            const response = await fetch(`/api/alerts/${alertId}`, {
                method: 'DELETE',
            });
            if (response.ok) {
                setAlerts(prev => prev.filter(a => a.id !== alertId));
            } else {
                console.error('Failed to delete alert');
            }
        } catch (err) {
            console.error('Error deleting alert:', err);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading alerts...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Active Alerts</h1>
                <p className="text-muted-foreground">
                    Monitor and manage alerts from your solar farm
                </p>
            </div>

            {/* Alerts Grid */}
            {alerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold">No active alerts</h3>
                    <p className="text-muted-foreground">All systems are operating normally.</p>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {alerts.map((alert) => (
                        <AlertCard
                            key={alert.id}
                            alert={alert}
                            onDismiss={handleDismiss}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
