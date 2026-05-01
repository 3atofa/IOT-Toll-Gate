import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from '../services/i18n.service';

/**
 * Translate pipe. Impure so it reacts when the language changes.
 * Usage: {{ 'nav.dashboard' | t }}
 */
@Pipe({
  name: 't',
  standalone: true,
  pure: false,
})
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(key: string | null | undefined): string {
    if (!key) {
      return '';
    }
    // Read the signal so Angular re-evaluates this pipe on language change.
    this.i18n.lang();
    return this.i18n.t(key);
  }
}
