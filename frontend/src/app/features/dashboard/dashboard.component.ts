import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { CaptureApiService } from '../../core/services/capture-api.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { RealtimeService } from '../../core/services/realtime.service';
import { GateCapture } from '../../core/models/gate-capture.model';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterLink, DatePipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit, OnDestroy {
  latestCapture: GateCapture | null = null;
  loading = true;
  private subscriptions = new Subscription();

  constructor(
    private readonly captureApi: CaptureApiService,
    private readonly realtime: RealtimeService,
    private readonly feedback: FeedbackService
  ) {}

  ngOnInit(): void {
    this.loadLatestCapture();

    const realtimeSub = this.realtime.onNewCapture().subscribe({
      next: (capture) => {
        this.latestCapture = capture;
        this.feedback.successToast('A new gate capture just arrived.', 'Live Update');
      },
    });

    this.subscriptions.add(realtimeSub);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  loadLatestCapture(): void {
    this.loading = true;

    this.captureApi.getLatestCapture().subscribe({
      next: (capture) => {
        this.latestCapture = capture;
        this.loading = false;
      },
      error: () => {
        this.latestCapture = null;
        this.loading = false;
        this.feedback.infoToast('No captures yet. Trigger one from ESP32-CAM.', 'Waiting');
      },
    });
  }

  getStatusLabel(eventType: string): string {
    switch (eventType) {
      case 'access_granted':
        return 'Access Granted';
      case 'access_denied':
        return 'Access Denied';
      default:
        return 'Manual Capture';
    }
  }
}
