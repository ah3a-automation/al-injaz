import { Button } from '@/Components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/Components/ui/tooltip';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface CopyButtonProps {
    text: string;
    className?: string;
    size?: 'sm' | 'icon' | 'default' | 'lg';
    variant?: 'ghost' | 'outline' | 'link' | 'default' | 'secondary' | 'destructive';
}

export function CopyButton({ text, className, size = 'icon', variant = 'ghost' }: CopyButtonProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // ignore
        }
    };

    return (
        <TooltipProvider delayDuration={0}>
            <Tooltip open={copied}>
                <TooltipTrigger asChild>
                    <Button
                        type="button"
                        variant={variant}
                        size={size}
                        className={className}
                        onClick={handleCopy}
                        aria-label={copied ? 'Copied' : 'Copy'}
                    >
                        {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Copied</TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
