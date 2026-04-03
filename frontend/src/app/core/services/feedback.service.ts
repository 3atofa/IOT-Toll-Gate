import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';
import { ToastrService } from 'ngx-toastr';

@Injectable({ providedIn: 'root' })
export class FeedbackService {
  constructor(private readonly toastr: ToastrService) {}

  successToast(message: string, title = 'Success'): void {
    this.toastr.success(message, title);
  }

  errorToast(message: string, title = 'Error'): void {
    this.toastr.error(message, title);
  }

  infoToast(message: string, title = 'Info'): void {
    this.toastr.info(message, title);
  }

  async confirmDelete(message: string): Promise<boolean> {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: message,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#1d4ed8',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, continue',
    });

    return result.isConfirmed;
  }
}
