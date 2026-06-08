'use client';

import { useEffect, useState } from 'react';

const STEPS = [
  {
    label: 'Computing COCOMO baseline',
    sublabel: 'Scale factors · effort multipliers · E_nom',
    icon: (active: boolean) => (
      <svg
        className={`h-5 w-5 ${active ? 'animate-spin' : ''}`}
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94H9.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </svg>
    ),
  },
  {
    label: 'Extracting semantic signals',
    sublabel: 'Sending project description to Claude',
    icon: (active: boolean) => (
      <svg
        className={`h-5 w-5 ${active ? 'animate-pulse' : ''}`}
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
      </svg>
    ),
  },
  {
    label: 'Computing hybrid estimate',
    sublabel: 'E_final = E_nom × ∏ Aᵢ',
    icon: (active: boolean) => (
      <svg
        className={`h-5 w-5 ${active ? 'animate-pulse' : ''}`}
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
      </svg>
    ),
  },
] as const;

// Step 0 stays for 2 s, step 1 stays for 3.5 s, then step 2 holds until resolved
const STEP_DELAYS_MS = [2000, 5500];

interface Props {
  isOpen: boolean;
  error: string | null;
  onDismissError: () => void;
}

export function EstimationLoaderModal({ isOpen, error, onDismissError }: Props) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!isOpen) { setCurrentStep(0); return; }
    if (error) return;

    setCurrentStep(0);
    const t1 = setTimeout(() => setCurrentStep(1), STEP_DELAYS_MS[0]);
    const t2 = setTimeout(() => setCurrentStep(2), STEP_DELAYS_MS[1]);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [isOpen, error]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog" aria-modal="true" aria-label="Running estimation"
    >
      <div className="mx-4 w-full max-w-sm rounded-xl border border-border bg-background p-8 shadow-2xl">
        {error ? (
          <div className="space-y-5 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
              <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-foreground">Estimation failed</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <button
              onClick={onDismissError}
              className="w-full rounded-md bg-muted px-4 py-2 text-sm font-medium text-foreground transition-opacity hover:opacity-80"
            >
              Dismiss
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-1 text-center">
              <p className="font-semibold text-foreground">Running Estimation</p>
              <p className="text-xs text-muted-foreground">This usually takes 5 – 10 seconds</p>
            </div>

            <ol className="space-y-4">
              {STEPS.map((step, index) => {
                const done   = index < currentStep;
                const active = index === currentStep;
                const pending = index > currentStep;

                return (
                  <li key={step.label} className="flex items-start gap-3">
                    {/* icon container */}
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors duration-500 ${
                      done    ? 'border-green-600 bg-green-600/20 text-green-400' :
                      active  ? 'border-accent bg-accent/10 text-accent' :
                                'border-border bg-muted text-muted-foreground'
                    }`}>
                      {done ? (
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      ) : (
                        step.icon(active)
                      )}
                    </div>

                    {/* text */}
                    <div className={`flex flex-col gap-0.5 pt-1 transition-opacity duration-500 ${pending ? 'opacity-40' : 'opacity-100'}`}>
                      <span className={`text-sm font-medium ${active ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {step.label}
                      </span>
                      <span className="text-xs text-muted-foreground">{step.sublabel}</span>
                    </div>
                  </li>
                );
              })}
            </ol>

            {/* indeterminate progress bar */}
            <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full w-1/3 rounded-full bg-accent animate-[progress_1.5s_ease-in-out_infinite]" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
