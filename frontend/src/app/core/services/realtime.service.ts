import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { API_CONFIG } from '../config/api.config';
import { GateCapture } from '../models/gate-capture.model';
import { SecurityAlert } from '../models/security.model';

interface GateStatus {
  gateId: string;
  status: 'open' | 'closed' | 'error';
  timestamp: string;
  commandedBy: string;
}

@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private socket: Socket | null = null;

  connect(): void {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(API_CONFIG.socketUrl, {
      transports: ['websocket', 'polling'],
    });
  }

  onNewCapture(): Observable<GateCapture> {
    this.connect();

    return new Observable<GateCapture>((observer) => {
      this.socket?.on('new_capture', (payload: GateCapture) => {
        observer.next(payload);
      });

      return () => {
        this.socket?.off('new_capture');
      };
    });
  }

  onGateStatusChanged(): Observable<GateStatus> {
    this.connect();

    return new Observable<GateStatus>((observer) => {
      this.socket?.on('gate_status_changed', (payload: GateStatus) => {
        observer.next(payload);
      });

      return () => {
        this.socket?.off('gate_status_changed');
      };
    });
  }

  onVehiclePassage(): Observable<any> {
    this.connect();

    return new Observable((observer) => {
      this.socket?.on('vehicle_passage', (payload) => {
        observer.next(payload);
      });

      return () => {
        this.socket?.off('vehicle_passage');
      };
    });
  }

  onSecurityAlert(): Observable<SecurityAlert> {
    this.connect();

    return new Observable<SecurityAlert>((observer) => {
      this.socket?.on('security_alert', (payload: SecurityAlert) => {
        observer.next(payload);
      });

      return () => {
        this.socket?.off('security_alert');
      };
    });
  }
}
