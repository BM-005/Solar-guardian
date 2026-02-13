import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { AlertCard } from '@/components/dashboard/AlertCard';
import type { FaultDetection } from '@/types/solar';

export default function Alerts() {
    const [faults, setFaults] = useState<FaultDetection[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchFaults() {
            try {
                const response = await fetch('/api/faults');
                if (response.ok) {
                    const data = await response.json();
                    const transformed = data.map((f: any) => ({
                        ...f,
                        location: { x: f.locationX || 50, y: f.locationY || 50 },
                        detectedAt: new Date(f.detectedAt),
                    }));
                    setFaults(transformed);
                }
            } catch (err) {
                console.warn('API unavailable, showing empty alerts');
                // Faults remain empty
            } finally {
                setLoading(false);
            }
        }

        fetchFaults();
    }, []);

    const handleDismiss = (faultId: string) => {
        setFaults(prev => prev.filter(f => f.id !== faultId));
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
                    Monitor and manage fault detections in your solar farm
                </p>
            </div>

            {/* Alerts Grid */}
            {faults.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold">No active alerts</h3>
                    <p className="text-muted-foreground">All systems are operating normally.</p>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {faults.map((fault) => (
                        <AlertCard
                            key={fault.id}
                            fault={fault}
                            onDismiss={handleDismiss}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

