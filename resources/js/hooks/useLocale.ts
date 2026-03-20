import { usePage } from '@inertiajs/react';

interface Translations {
  ui?:                Record<string, string>;
  nav?:               Record<string, string>;
  dashboard?:         Record<string, string>;
  suppliers?:         Record<string, string>;
  admin?:             Record<string, string>;
  rfqs?:              Record<string, string>;
  packages?:          Record<string, string>;
  tasks?:             Record<string, string>;
  purchase_requests?: Record<string, string>;
  supplier_portal?:   Record<string, string>;
  activity?:          Record<string, string>;
  documents?:         Record<string, string>;
  contracts?:         Record<string, string>;
  contract_articles?: Record<string, string>;
  contract_templates?: Record<string, string>;
  supplier_categories?: Record<string, string>;
}

interface SharedProps {
  locale: 'en' | 'ar';
  dir?: 'ltr' | 'rtl';
  translations?: Translations;
  [key: string]: unknown;
}

type Namespace = keyof Translations;
type Replacements = Record<string, string | number>;

export function useLocale(defaultNamespace?: Namespace) {
  const { locale, dir: sharedDir, translations } = usePage().props as SharedProps;
  const isRTL = locale === 'ar';
  const dir = sharedDir ?? (isRTL ? 'rtl' : 'ltr');

  /**
   * t('search')                                    → translations.ui.search
   * t('dashboard', 'nav')                          → translations.nav.dashboard
   * t('welcome', 'dashboard', { name: user.name }) → "Welcome, Ahmed. Overview..."
   * t('total_rfqs', 'dashboard', { count: 6 })     → "Total: 6 RFQs"
   */
  const t = (
    key: string,
    namespace: Namespace = defaultNamespace ?? 'ui',
    replacements?: Replacements
  ): string => {
    const ns = translations?.[namespace] as Record<string, unknown> | undefined;
    let raw: string | undefined =
      ns != null && typeof ns[key] === 'string' ? (ns[key] as string) : undefined;
    if (raw === undefined && key.includes('.')) {
      const value = key.split('.').reduce(
        (obj: unknown, k) =>
          obj != null && typeof obj === 'object' && k in obj
            ? (obj as Record<string, unknown>)[k]
            : undefined,
        ns
      );
      raw = typeof value === 'string' ? value : undefined;
    }
    if (raw === undefined) raw = key;

    // Simple pluralization support for Laravel-style plural strings:
    // "{0} ...|{1} ...|[2,*] ..." with :count / :days, etc.
    if (replacements && (raw.includes('{0}') || raw.includes('{1}') || raw.includes('['))) {
      const count = (replacements.count ?? replacements.days) as number | undefined;
      if (typeof count === 'number') {
        const parts = raw.split('|').map((p) => p.trim());
        let selected = parts[parts.length - 1] ?? raw;

        for (const part of parts) {
          const match = part.match(/^(\{(\d+)\}|\[(\d+),\*\])\s*(.*)$/);
          if (!match) continue;
          const exact = match[2] !== undefined ? Number(match[2]) : null;
          const rangeStart = match[3] !== undefined ? Number(match[3]) : null;
          const text = match[4] ?? '';

          if (exact !== null && count === exact) {
            selected = text;
            break;
          }
          if (rangeStart !== null && count >= rangeStart) {
            selected = text;
          }
        }

        raw = selected;
      }
    }

    let value = raw;

    if (replacements) {
      Object.entries(replacements).forEach(([placeholder, replacement]) => {
        value = value.replaceAll(`:${placeholder}`, String(replacement));
      });
    }

    return value;
  };

  return { locale, isRTL, dir, t } as const;
}

