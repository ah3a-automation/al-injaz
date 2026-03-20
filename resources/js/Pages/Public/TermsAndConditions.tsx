import { Head } from '@inertiajs/react';
import { useLocale } from '@/hooks/useLocale';
import GuestSupplierLayout from '@/Layouts/GuestSupplierLayout';

export default function TermsAndConditions() {
    const { t, locale } = useLocale();

    const termsSection = [
        { title: t('terms_section_1_title', 'supplier_portal'), content: t('terms_section_1_content', 'supplier_portal') },
        { title: t('terms_section_2_title', 'supplier_portal'), content: t('terms_section_2_content', 'supplier_portal') },
        { title: t('terms_section_3_title', 'supplier_portal'), content: t('terms_section_3_content', 'supplier_portal') },
        { title: t('terms_section_4_title', 'supplier_portal'), content: t('terms_section_4_content', 'supplier_portal') },
        { title: t('terms_section_5_title', 'supplier_portal'), content: t('terms_section_5_content', 'supplier_portal') },
        { title: t('terms_section_6_title', 'supplier_portal'), content: t('terms_section_6_content', 'supplier_portal') },
        { title: t('terms_section_7_title', 'supplier_portal'), content: t('terms_section_7_content', 'supplier_portal') },
        { title: t('terms_section_8_title', 'supplier_portal'), content: t('terms_section_8_content', 'supplier_portal') },
    ];

    return (
        <GuestSupplierLayout title={t('terms_conditions', 'supplier_portal')}>
            <Head>
                <title>{t('terms_conditions', 'supplier_portal')}</title>
                <meta name="description" content={t('terms_meta_desc', 'supplier_portal')} />
            </Head>
            <div className="mx-auto max-w-3xl px-4 py-10" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                    {t('terms_conditions', 'supplier_portal')}
                </h1>
                <p className="text-sm text-muted-foreground mb-8">
                    {t('terms_intro', 'supplier_portal')}
                </p>
                <div className="space-y-6">
                    {termsSection.map((s, i) => (
                        <div key={i}>
                            <h2 className="text-base font-semibold text-foreground mb-2">{s.title}</h2>
                            <p className="text-sm text-muted-foreground leading-relaxed">{s.content}</p>
                        </div>
                    ))}
                </div>
                <p className="mt-10 text-xs text-muted-foreground border-t border-border pt-4">
                    {t('pdpl_compliance', 'supplier_portal')}
                </p>
            </div>
        </GuestSupplierLayout>
    );
}
