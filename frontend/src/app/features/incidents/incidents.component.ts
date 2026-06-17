import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, HostListener, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IncidentApiService } from '../../core/services/incident-api.service';
import { TechnicianApiService } from '../../core/services/technician-api.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { I18nService } from '../../core/services/i18n.service';
import { Incident, IncidentSeverity, IncidentStatus, CreateIncidentDto } from '../../core/models/incident.model';
import { Technician } from '../../core/models/technician.model';

@Component({
  selector: 'app-incidents',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule],
  templateUrl: './incidents.component.html',
})
export class IncidentsComponent implements OnInit {
  readonly i18n = inject(I18nService);

  incidents: Incident[] = [];
  technicians: Technician[] = [];
  loading = false;

  // Filters
  filterStatus  = '';
  filterSeverity = '';
  filterSearch  = '';

  // Create / Edit modal
  showFormModal = false;
  editingId: string | null = null;
  formData: CreateIncidentDto & { status?: IncidentStatus; resolutionNotes?: string } = this.emptyForm();

  // Detail modal
  showDetailModal = false;
  detailIncident: Incident | null = null;

  // Assign modal
  showAssignModal = false;
  assignIncidentId: string | null = null;
  assignTechId = '';
  assignNotes  = '';
  assignLoading = false;

  // Resolve modal
  showResolveModal = false;
  resolveIncidentId: string | null = null;
  resolveNotes  = '';
  resolveRepairCost = 0;

  severities: IncidentSeverity[] = ['low', 'medium', 'high', 'critical'];
  statuses: IncidentStatus[]     = ['open', 'in_progress', 'resolved'];

  constructor(
    private readonly incidentApi: IncidentApiService,
    private readonly techApi: TechnicianApiService,
    private readonly feedback: FeedbackService,
  ) {}

  ngOnInit(): void {
    this.load();
    this.techApi.getAll({ status: 'active' }).subscribe({ next: (t) => (this.technicians = t) });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.showFormModal    = false;
    this.showDetailModal  = false;
    this.showAssignModal  = false;
    this.showResolveModal = false;
  }

  load(): void {
    this.loading = true;
    this.incidentApi.getAll({
      status:   this.filterStatus   || undefined,
      severity: this.filterSeverity || undefined,
      search:   this.filterSearch   || undefined,
    }).subscribe({
      next:  (data) => { this.incidents = data; this.loading = false; },
      error: () => { this.feedback.errorToast(this.i18n.t('incidents.loadFailed')); this.loading = false; },
    });
  }

  // ── Create / Edit ────────────────────────────────────────────────
  openCreate(): void {
    this.editingId = null;
    this.formData  = this.emptyForm();
    this.showFormModal = true;
  }

  openEdit(inc: Incident): void {
    this.editingId = inc.id;
    this.formData  = {
      title: inc.title, description: inc.description, gateId: inc.gateId,
      severity: inc.severity, status: inc.status, reportedBy: inc.reportedBy,
      repairCost: inc.repairCost, resolutionNotes: inc.resolutionNotes,
    };
    this.showFormModal = true;
  }

  saveForm(): void {
    if (!this.formData.title || !this.formData.gateId) {
      this.feedback.errorToast(this.i18n.t('incidents.titleRequired'));
      return;
    }
    const obs = this.editingId
      ? this.incidentApi.update(this.editingId, this.formData)
      : this.incidentApi.create(this.formData);
    obs.subscribe({
      next: () => {
        this.showFormModal = false;
        this.feedback.successToast(this.i18n.t(this.editingId ? 'incidents.updated' : 'incidents.created'));
        this.load();
      },
      error: () => this.feedback.errorToast(this.i18n.t('incidents.saveFailed')),
    });
  }

  // ── Detail view ──────────────────────────────────────────────────
  openDetail(id: string): void {
    this.incidentApi.getById(id).subscribe({
      next: (inc) => { this.detailIncident = inc; this.showDetailModal = true; },
      error: () => this.feedback.errorToast(this.i18n.t('incidents.loadDetailFailed')),
    });
  }

  // ── Assign technician ────────────────────────────────────────────
  openAssign(incidentId: string): void {
    this.assignIncidentId = incidentId;
    this.assignTechId = '';
    this.assignNotes  = '';
    this.showAssignModal = true;
  }

  doAssign(): void {
    if (!this.assignIncidentId || !this.assignTechId) return;
    this.assignLoading = true;
    this.incidentApi.assign(this.assignIncidentId, this.assignTechId, this.assignNotes).subscribe({
      next: () => {
        this.showAssignModal = false;
        this.assignLoading   = false;
        this.feedback.successToast(this.i18n.t('incidents.techAssigned'));
        this.load();
      },
      error: (err) => {
        this.assignLoading = false;
        this.feedback.errorToast(err?.error?.error || this.i18n.t('incidents.assignFailed'));
      },
    });
  }

  // ── Resolve ──────────────────────────────────────────────────────
  openResolve(incidentId: string, currentCost: number = 0): void {
    this.resolveIncidentId  = incidentId;
    this.resolveNotes       = '';
    this.resolveRepairCost  = currentCost;
    this.showResolveModal   = true;
  }

  doResolve(): void {
    if (!this.resolveIncidentId) return;
    this.incidentApi.update(this.resolveIncidentId, {
      status: 'resolved',
      resolutionNotes: this.resolveNotes,
      repairCost: this.resolveRepairCost,
    }).subscribe({
      next: () => {
        this.showResolveModal = false;
        this.feedback.successToast(this.i18n.t('incidents.incidentResolved'));
        this.load();
      },
      error: () => this.feedback.errorToast(this.i18n.t('incidents.resolveFailed')),
    });
  }

  // ── Delete ───────────────────────────────────────────────────────
  deleteIncident(id: string): void {
    if (!confirm(this.i18n.t('incidents.deleteConfirm'))) return;
    this.incidentApi.delete(id).subscribe({
      next:  () => { this.feedback.successToast(this.i18n.t('incidents.deleted')); this.load(); },
      error: () => this.feedback.errorToast(this.i18n.t('incidents.deleteFailed')),
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────
  emptyForm(): CreateIncidentDto & { status?: IncidentStatus; resolutionNotes?: string } {
    return { title: '', description: '', gateId: '', severity: 'medium', status: 'open', reportedBy: '', repairCost: 0, resolutionNotes: '' };
  }

  severityClass(s: IncidentSeverity): string {
    const map: Record<IncidentSeverity, string> = {
      low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
      medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
      high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
      critical: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    };
    return map[s] ?? 'bg-slate-100 text-slate-600';
  }

  statusClass(s: IncidentStatus): string {
    const map: Record<IncidentStatus, string> = {
      open: 'bg-red-100 text-red-700',
      in_progress: 'bg-amber-100 text-amber-700',
      resolved: 'bg-emerald-100 text-emerald-700',
    };
    return map[s] ?? 'bg-slate-100 text-slate-600';
  }

  sevLabel(s: IncidentSeverity): string {
    const map: Record<IncidentSeverity, string> = {
      low: 'incidents.sev.low', medium: 'incidents.sev.medium',
      high: 'incidents.sev.high', critical: 'incidents.sev.critical',
    };
    return this.i18n.t(map[s] ?? s);
  }

  statusLabel(s: IncidentStatus): string {
    const map: Record<IncidentStatus, string> = {
      open: 'incidents.status.open',
      in_progress: 'incidents.status.inProgress',
      resolved: 'incidents.status.resolved',
    };
    return this.i18n.t(map[s] ?? s);
  }

  get filteredIncidents(): Incident[] { return this.incidents; }
  get openCount(): number       { return this.incidents.filter(i => i.status === 'open').length; }
  get inProgressCount(): number { return this.incidents.filter(i => i.status === 'in_progress').length; }
  get resolvedCount(): number   { return this.incidents.filter(i => i.status === 'resolved').length; }

  techName(id: string | null | undefined): string {
    if (!id) return '—';
    const t = this.technicians.find(t => t.id === id);
    return t ? t.fullName : id.slice(0, 8) + '…';
  }
}
