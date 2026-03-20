import { router, usePage } from '@inertiajs/react';
import { Globe } from 'lucide-react';

type Locale = 'en' | 'ar';

export default function LanguageSwitcher() {
  const { locale } = usePage().props as { locale: Locale };

  const switchLocale = (newLocale: Locale) => {
    if (newLocale === locale) return;

    try {
      localStorage.setItem('locale', newLocale);
    } catch {
      // ignore storage errors (e.g. disabled cookies)
    }

    router.post(
      route('locale.switch'),
      { locale: newLocale },
      {
        preserveScroll: true,
        preserveState: false,
      }
    );
  };

  const locales: Locale[] = ['en', 'ar'];

  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1">
      <Globe className="ms-1.5 h-3.5 w-3.5 text-muted-foreground" />
      {locales.map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => switchLocale(lang)}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
            locale === lang
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          aria-pressed={locale === lang}
          aria-label={lang === 'en' ? 'Switch to English' : 'Switch to Arabic'}
        >
          {lang === 'en' ? 'EN' : 'AR'}
        </button>
      ))}
    </div>
  );
}

