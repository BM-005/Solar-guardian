import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { PiAnalysisResult, convertPiResultToSolarScan, SolarScan } from '@/types/solar';

export interface PiReceiverState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  piScans: SolarScan[];
  totalPiScans: number;
  serverUrl: string;
}

export interface UsePiReceiverReturn extends PiReceiverState {
  connect: (url: string) => void;
  disconnect: () => void;
  clearPiScans: () => void;
  removePiScan: (scanId: string) => void;
}

const DEFAULT_PI_RECEIVER_URL =
  import.meta.env.VITE_PI_RECEIVER_URL ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:3000';

export function usePiReceiver(): UsePiReceiverReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [piScans, setPiScans] = useState<SolarScan[]>([]);
  const [serverUrl, setServerUrl] = useState(DEFAULT_PI_RECEIVER_URL);

  const socketRef = useRef<Socket | null>(null);

  const loadHistory = useCallback(async (url: string) => {
    try {
      const response = await fetch(`${url}/api/pi-results`);
      if (!response.ok) {
        return;
      }

      const payload = await response.json();
      const items = Array.isArray(payload?.results) ? payload.results : [];
      const mapped = items
        .map((item: PiAnalysisResult) => {
          try {
            return convertPiResultToSolarScan(item);
          } catch {
            return null;
          }
        })
        .filter(Boolean) as SolarScan[];

      setPiScans(mapped);
    } catch {
      // History endpoint is optional for realtime functionality.
    }
  }, []);

  const connect = useCallback(
    (url: string) => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }

      setIsConnecting(true);
      setError(null);
      setServerUrl(url);

      try {
        const socket = io(url, {
          path: '/socket.io',
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: Infinity,
          reconnectionDelay: 1000,
          timeout: 10000,
        });

        socket.on('connect', () => {
          setIsConnected(true);
          setIsConnecting(false);
          setError(null);
          loadHistory(url);
        });

        socket.on('disconnect', () => {
          setIsConnected(false);
        });

        socket.on('connect_error', (err) => {
          setError(err.message);
          setIsConnecting(false);
          setIsConnected(false);
        });

        socket.on('new_result', (data: PiAnalysisResult) => {
          try {
            const solarScan = convertPiResultToSolarScan(data);
            setPiScans((prev) => {
              const deduped = prev.filter((scan) => scan.id !== solarScan.id);
              return [solarScan, ...deduped].slice(0, 50);
            });
          } catch (err) {
            console.error('Error converting Pi result:', err);
          }
        });

        socketRef.current = socket;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to connect');
        setIsConnecting(false);
      }
    },
    [loadHistory]
  );

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
  }, []);

  const clearPiScans = useCallback(() => {
    setPiScans([]);
  }, []);

  const removePiScan = useCallback((scanId: string) => {
    setPiScans((prev) => prev.filter((scan) => scan.id !== scanId));
  }, []);

  useEffect(() => {
    if (DEFAULT_PI_RECEIVER_URL && !socketRef.current) {
      connect(DEFAULT_PI_RECEIVER_URL);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [connect]);

  return {
    isConnected,
    isConnecting,
    error,
    piScans,
    totalPiScans: piScans.length,
    serverUrl,
    connect,
    disconnect,
    clearPiScans,
    removePiScan,
  };
}
