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
        <div className="mb-8 w-full overflow-x-auto overflow-y-hidden pb-2 [-ms-overflow-style:none] [scrollbar-width:thin] sm:overflow-visible">
            <div className="flex min-w-max items-center justify-between gap-0 px-1 sm:min-w-0 sm:w-full">
                {steps.map((step, index) => {
                    const stepNumber = index + 1;
                    const isCompleted = stepNumber < currentStep;
                    const isCurrent = stepNumber === currentStep;

                    return (
                        <div
                            key={step.label}
                            className="flex w-[7.25rem] shrink-0 flex-col items-center sm:w-auto sm:min-w-0 sm:flex-1"
                        >
                            <div className="flex w-full items-center">
                                {index > 0 && (
                                    <div
                                        className={`mx-1 h-0.5 flex-1 sm:mx-2 ${
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
                                        className={`mx-1 h-0.5 flex-1 sm:mx-2 ${
                                            isCompleted ? 'bg-primary' : 'bg-muted'
                                        }`}
                                    />
                                )}
                            </div>
                            <span
                                className={`mt-1 max-w-[7rem] text-center text-xs leading-tight sm:max-w-none ${
                                    isCurrent ? 'font-medium text-primary' : 'text-muted-foreground'
                                }`}
                            >
                                {step.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
