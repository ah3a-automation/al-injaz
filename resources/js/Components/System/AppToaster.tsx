import { Toaster } from '@/Components/ui/sonner';
import { toast } from 'sonner';

export default function AppToaster() {
    return <Toaster />;
}

export { toast as useToast };
