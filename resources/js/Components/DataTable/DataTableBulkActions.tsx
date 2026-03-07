import { useConfirm } from '@/hooks';
import { Button } from '@/Components/ui/button';

interface DataTableBulkActionsProps {
  selectedCount: number;
  selectedIds: string[];
  actions: Array<{
    label: string;
    action: string;
    variant?: 'default' | 'destructive';
  }>;
  onAction: (action: string, ids: string[]) => void;
  onClearSelection: () => void;
}

export function DataTableBulkActions({
  selectedCount,
  selectedIds,
  actions,
  onAction,
  onClearSelection,
}: DataTableBulkActionsProps) {
  const { confirmDelete } = useConfirm();

  const handleAction = (action: string, variant?: 'default' | 'destructive') => {
    if (variant === 'destructive') {
      confirmDelete(
        `This action cannot be undone. Proceed with ${selectedCount} item(s)?`
      ).then((confirmed) => {
        if (confirmed) onAction(action, selectedIds);
      });
    } else {
      onAction(action, selectedIds);
    }
  };

  return (
    <div className="sticky top-0 z-10 flex items-center gap-3 rounded-md border bg-background px-4 py-2 shadow-sm">
      <span className="text-sm font-medium">{selectedCount} selected</span>
      <div className="flex items-center gap-2">
        {actions.map(({ label, action, variant }) => (
          <Button
            key={action}
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            size="sm"
            onClick={() => handleAction(action, variant)}
          >
            {label}
          </Button>
        ))}
      </div>
      <Button variant="ghost" size="sm" onClick={onClearSelection}>
        Clear
      </Button>
    </div>
  );
}
