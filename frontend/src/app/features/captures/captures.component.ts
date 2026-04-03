import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { CaptureApiService } from '../../core/services/capture-api.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { GateCapture } from '../../core/models/gate-capture.model';

@Component({
  selector: 'app-captures',
  imports: [CommonModule, DatePipe],
  templateUrl: './captures.component.html',
  styleUrl: './captures.component.css',
})
export class CapturesComponent implements OnInit {
  captures: GateCapture[] = [];
  loading = true;

  constructor(
    private readonly captureApi: CaptureApiService,
    private readonly feedback: FeedbackService
  ) {}

  ngOnInit(): void {
    this.loadCaptures();
  }

  loadCaptures(): void {
    this.loading = true;

    this.captureApi.getCaptures(50, 0).subscribe({
      next: (response) => {
        this.captures = response.items;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.feedback.errorToast('Failed to load capture history from server.');
      },
    });
  }

  displayImageUrl(imagePath: string | null | undefined): string {
    if (!imagePath) {
      return '';
    }

    if (imagePath.startsWith('/')) {
      return `${window.location.origin}${imagePath}`;
    }

    if (window.location.protocol === 'https:' && imagePath.startsWith('http://')) {
      return imagePath.replace(/^http:\/\//i, 'https://');
    }

    return imagePath;
  }
}
