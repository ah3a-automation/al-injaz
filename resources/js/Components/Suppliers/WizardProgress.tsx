import { Check } from 'lucide-react';

export interface WizardStep {
    label: string;
    description?: string;
}

interface WizardProgressProps {
    currentStep: number;
    steps: WizardStep[];
}

export function WizardProgress({ currentStep, steps }: WizardProgressProps) {
    return (
        <div className="mb-8 flex w-full items-center justify-between">
            {steps.map((step, index) => {
                const stepNumber = index + 1;
                const isCompleted = stepNumber < currentStep;
                const isCurrent = stepNumber === currentStep;

                return (
                    <div key={step.label} className="flex flex-1 flex-col items-center">
                        <div className="flex w-full items-center">
                            {index > 0 && (
                                <div
                                    className={`mx-2 h-0.5 flex-1 ${
                                        isCompleted ? 'bg-primary' : 'bg-muted'
                                    }`}
                                />
                            )}
                            <div
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-medium transition-colors ${
                                    isCompleted
                                        ? 'border-primary bg-primary text-primary-foreground'
                                        : isCurrent
                                          ? 'border-primary bg-background text-primary'
                                          : 'border-muted-foreground/30 bg-background text-muted-foreground'
                                }`}
                            >
                                {isCompleted ? (
                                    <Check className="h-4 w-4" />
                                ) : (
                                    stepNumber
                                )}
                            </div>
                            {index < steps.length - 1 && (
                                <div
                                    className={`mx-2 h-0.5 flex-1 ${
                                        isCompleted ? 'bg-primary' : 'bg-muted'
                                    }`}
                                />
                            )}
                        </div>
                        <span
                            className={`mt-1 text-center text-xs ${
                                isCurrent ? 'text-primary font-medium' : 'text-muted-foreground'
                            }`}
                        >
                            {step.label}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}
