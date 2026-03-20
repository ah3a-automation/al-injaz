import { Button } from '@/Components/ui/button';
import { useLocale } from '@/hooks/useLocale';

interface LinkedExpiryFieldHintProps {
    fieldLabel: string;
    currentValue?: string | null;
    onEditField?: () => void;
}

export default function LinkedExpiryFieldHint({
    fieldLabel,
    currentValue,
    onEditField,
}: LinkedExpiryFieldHintProps) {
    const { t } = useLocale();
    const displayValue = currentValue && currentValue.trim() !== ''
        ? currentValue
        : t('document_expiry_not_set', 'supplier_portal');

    return (
        <div className="rounded-md border border-sky-200/70 bg-sky-50/60 px-2.5 py-2 text-[11px] text-sky-900 dark:border-sky-900/40 dark:bg-sky-950/10 dark:text-sky-100">
            <p className="font-medium">
                {t('document_expiry_linked_to', 'supplier_portal').replace(':field', fieldLabel)}
            </p>
            <p className="mt-0.5 text-sky-800/80 dark:text-sky-200/80">
                {t('document_expiry_current_value', 'supplier_portal').replace(':value', displayValue)}
            </p>
            {onEditField && (
                <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="mt-1 h-auto px-0 py-0 text-[11px] text-sky-700 dark:text-sky-300"
                    onClick={onEditField}
                >
                    {t('document_expiry_edit_field', 'supplier_portal')}
                </Button>
            )}
        </div>
    );
}
