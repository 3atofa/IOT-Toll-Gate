import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, HostListener, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TechnicianApiService } from '../../core/services/technician-api.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { I18nService } from '../../core/services/i18n.service';
import { Technician, CreateTechnicianDto, TechnicianSpecialization, TechnicianStatus } from '../../core/models/technician.model';

@Component({
  selector: 'app-technicians',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule],
  templateUrl: './technicians.component.html',
})
export class TechniciansComponent implements OnInit {
  readonly i18n = inject(I18nService);

  technicians: Technician[] = [];
  loading = false;

  filterSearch = '';
  filterStatus = '';
  filterSpec   = '';

  showFormModal = false;
  editingId: string | null = null;
  formData: CreateTechnicianDto = this.emptyForm();
  saving = false;

  specializations: TechnicianSpecialization[] = ['hardware', 'software', 'network', 'electrical', 'general'];
  statuses: TechnicianStatus[] = ['active', 'inactive', 'on_leave'];

  constructor(
    private readonly techApi: TechnicianApiService,
    private readonly feedback: FeedbackService,
  ) {}

  ngOnInit(): void { this.load(); }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.showFormModal = false; }

  load(): void {
    this.loading = true;
    this.techApi.getAll({
      status:         this.filterStatus || undefined,
      specialization: this.filterSpec   || undefined,
      search:         this.filterSearch || undefined,
    }).subscribe({
      next:  (data) => { this.technicians = data; this.loading = false; },
      error: () => { this.feedback.errorToast(this.i18n.t('tech.loadFailed')); this.loading = false; },
    });
  }

  openCreate(): void {
    this.editingId = null;
    this.formData  = this.emptyForm();
    this.showFormModal = true;
  }

  openEdit(t: Technician): void {
    this.editingId = t.id;
    this.formData  = {
      fullName: t.fullName, email: t.email, phone: t.phone,
      specialization: t.specialization, monthlySalary: t.monthlySalary,
      status: t.status, hireDate: t.hireDate, notes: t.notes,
    };
    this.showFormModal = true;
  }

  save(): void {
    if (!this.formData.fullName) { this.feedback.errorToast(this.i18n.t('tech.nameRequired')); return; }
    if (!this.formData.monthlySalary && this.formData.monthlySalary !== 0) {
      this.feedback.errorToast(this.i18n.t('tech.salaryRequired')); return;
    }
    this.saving = true;
    const obs = this.editingId
      ? this.techApi.update(this.editingId, this.formData)
      : this.techApi.create(this.formData);
    obs.subscribe({
      next: () => {
        this.showFormModal = false;
        this.saving = false;
        this.feedback.successToast(this.i18n.t(this.editingId ? 'tech.updated' : 'tech.added'));
        this.load();
      },
      error: (err) => {
        this.saving = false;
        this.feedback.errorToast(err?.error?.error || this.i18n.t('tech.saveFailed'));
      },
    });
  }

  delete(t: Technician): void {
    const msg = `${this.i18n.t('tech.deleteConfirmPrefix')} ${t.fullName}${this.i18n.t('tech.deleteConfirmSuffix')}`;
    if (!confirm(msg)) return;
    this.techApi.delete(t.id).subscribe({
      next:  () => { this.feedback.successToast(this.i18n.t('tech.deleted')); this.load(); },
      error: () => this.feedback.errorToast(this.i18n.t('tech.deleteFailed')),
    });
  }

  emptyForm(): CreateTechnicianDto {
    return { fullName: '', email: '', phone: '', specialization: 'general', monthlySalary: 0, status: 'active', hireDate: '', notes: '' };
  }

  specClass(s: TechnicianSpecialization): string {
    const map: Record<TechnicianSpecialization, string> = {
      hardware:   'bg-orange-100 text-orange-700',
      software:   'bg-blue-100 text-blue-700',
      network:    'bg-cyan-100 text-cyan-700',
      electrical: 'bg-yellow-100 text-yellow-700',
      general:    'bg-slate-100 text-slate-600',
    };
    return map[s] ?? 'bg-slate-100 text-slate-600';
  }

  statusClass(s: TechnicianStatus): string {
    const map: Record<TechnicianStatus, string> = {
      active:   'bg-emerald-100 text-emerald-700',
      inactive: 'bg-slate-100 text-slate-500',
      on_leave: 'bg-amber-100 text-amber-700',
    };
    return map[s] ?? 'bg-slate-100 text-slate-600';
  }

  specLabel(s: TechnicianSpecialization): string {
    const map: Record<TechnicianSpecialization, string> = {
      hardware: 'tech.spec.hardware', software: 'tech.spec.software',
      network: 'tech.spec.network', electrical: 'tech.spec.electrical', general: 'tech.spec.general',
    };
    return this.i18n.t(map[s] ?? s);
  }

  statusLabel(s: TechnicianStatus): string {
    const map: Record<TechnicianStatus, string> = {
      active: 'tech.status.active', inactive: 'tech.status.inactive', on_leave: 'tech.status.on_leave',
    };
    return this.i18n.t(map[s] ?? s);
  }

  get totalMonthlySalary(): number {
    return this.technicians
      .filter(t => t.status === 'active')
      .reduce((sum, t) => sum + +t.monthlySalary, 0);
  }

  get activeCount(): number  { return this.technicians.filter(t => t.status === 'active').length; }
  get onLeaveCount(): number { return this.technicians.filter(t => t.status === 'on_leave').length; }
}
