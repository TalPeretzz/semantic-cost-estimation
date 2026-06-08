import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-[calc(100vh-49px)] flex flex-col items-center justify-center px-6 py-24">
      <div className="w-full max-w-2xl space-y-10 text-center">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Semantic Cost Estimation
          </h1>
          <p className="text-lg text-muted-foreground">
            Hybrid software effort estimation combining{' '}
            <span className="text-foreground font-medium">COCOMO II</span> parametric
            modelling with qualitative signals extracted by{' '}
            <span className="text-foreground font-medium">Claude</span>.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Link
            href="/projects"
            className="flex flex-col gap-2 rounded-lg border border-border bg-muted px-5 py-5 text-left transition-colors hover:border-accent hover:bg-accent/10"
          >
            <span className="text-2xl" aria-hidden="true">&#128196;</span>
            <span className="font-semibold text-foreground">Projects</span>
            <span className="text-sm text-muted-foreground">Create projects and run effort estimations.</span>
          </Link>

          <Link
            href="/evaluation"
            className="flex flex-col gap-2 rounded-lg border border-border bg-muted px-5 py-5 text-left transition-colors hover:border-accent hover:bg-accent/10"
          >
            <span className="text-2xl" aria-hidden="true">&#128200;</span>
            <span className="font-semibold text-foreground">Evaluation</span>
            <span className="text-sm text-muted-foreground">Compare baseline vs hybrid MAE, RMSE, and MAPE.</span>
          </Link>

          <Link
            href="/dataset"
            className="flex flex-col gap-2 rounded-lg border border-border bg-muted px-5 py-5 text-left transition-colors hover:border-accent hover:bg-accent/10"
          >
            <span className="text-2xl" aria-hidden="true">&#128450;</span>
            <span className="font-semibold text-foreground">Dataset</span>
            <span className="text-sm text-muted-foreground">Bulk-import historical projects from a CSV file.</span>
          </Link>
        </div>

        <div className="rounded-lg border border-border bg-muted px-6 py-5 text-left space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">How it works</p>
          <ol className="space-y-2 text-sm text-muted-foreground list-none">
            <li><span className="text-foreground font-medium">1.</span> Create a project with size, team, and a description.</li>
            <li><span className="text-foreground font-medium">2.</span> Click Run Estimation — COCOMO II computes the baseline; Claude extracts five qualitative signals.</li>
            <li><span className="text-foreground font-medium">3.</span> Each signal maps to an adjustment factor; the hybrid estimate is E_nom times the product of all factors.</li>
            <li><span className="text-foreground font-medium">4.</span> On the Evaluation page, select projects with known actual effort to compute MAE, RMSE, and MAPE for both models.</li>
          </ol>
        </div>
      </div>
    </main>
  );
}
