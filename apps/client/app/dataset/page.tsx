'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { importDataset, ApiError } from '@/lib/api-client';
import type { ImportResult } from '@sce/types';

export default function DatasetPage() {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    if (!f.name.endsWith('.csv')) {
      setError('Only .csv files are supported');
      return;
    }
    setFile(f);
    setResult(null);
    setError(null);
  }, []);

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }

  async function handleImport() {
    if (!file) return;
    setImporting(true);
    setError(null);
    try {
      const res = await importDataset(file);
      setResult(res);
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Import failed. Please try again.');
    } finally {
      setImporting(false);
    }
  }

  return (
    <main className="min-h-screen px-6 py-16">
      <div className="mx-auto max-w-2xl space-y-10">
        <div className="space-y-1">
          <Link href="/evaluation" className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-opacity hover:opacity-80">
            <span aria-hidden="true">&#8592;</span> Evaluation Dashboard
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Import Dataset</h1>
          <p className="text-sm text-muted-foreground">
            Upload a CSV of historical projects to bulk-import them for evaluation.
          </p>
        </div>

        <section aria-labelledby="format-heading">
          <h2 id="format-heading" className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Required CSV Format
          </h2>
          <div className="rounded-lg border border-border bg-muted px-5 py-4 font-mono text-xs text-muted-foreground overflow-x-auto">
            <p className="text-foreground mb-1">name,description,domain,size_kloc,team_size,experience_level,actual_effort_pm</p>
            <p>Project A,A payment gateway system.,organic,15,6,nominal,120</p>
            <p>Project B,An analytics pipeline.,semi-detached,30,10,high,</p>
          </div>
          <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
            <li><span className="text-foreground">domain</span>: organic | semi-detached | embedded</li>
            <li><span className="text-foreground">experience_level</span>: very_low | low | nominal | high | very_high</li>
            <li><span className="text-foreground">actual_effort_pm</span>: optional — required for evaluation runs</li>
            <li>Max file size: 10 MB</li>
          </ul>
        </section>

        <section aria-labelledby="upload-heading">
          <h2 id="upload-heading" className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Upload File
          </h2>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-12 transition-colors ${
              dragging ? 'border-accent bg-accent/10' : 'border-border bg-muted hover:border-accent/50'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv"
              onChange={onInputChange}
              className="sr-only"
            />
            <span className="text-3xl text-muted-foreground" aria-hidden="true">&#8679;</span>
            {file ? (
              <div className="text-center">
                <p className="font-medium text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB — ready to import</p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm text-foreground">Drop CSV file here or click to browse</p>
                <p className="text-xs text-muted-foreground">Max 10 MB</p>
              </div>
            )}
          </div>

          {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>}

          {file && !importing && (
            <button
              onClick={handleImport}
              className="mt-4 rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-80"
            >
              Import {file.name}
            </button>
          )}

          {importing && (
            <p className="mt-4 text-sm text-muted-foreground animate-pulse">Importing...</p>
          )}
        </section>

        {result && (
          <section aria-labelledby="result-heading">
            <h2 id="result-heading" className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Import Result
            </h2>
            <div className="rounded-lg border border-border bg-muted px-5 py-4 space-y-3">
              <div className="flex gap-6 text-sm">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">Imported</span>
                  <span className="text-2xl font-bold text-green-600 dark:text-green-400">{result.imported}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">Skipped</span>
                  <span className="text-2xl font-bold text-muted-foreground">{result.skipped}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">Errors</span>
                  <span className="text-2xl font-bold text-red-600 dark:text-red-400">{result.errors.length}</span>
                </div>
              </div>

              {result.errors.length > 0 && (
                <ul className="space-y-1 border-t border-border pt-3">
                  {result.errors.map((err, i) => (
                    <li key={i} className="text-xs text-red-600 dark:text-red-400">Row {err.row}: {err.message}</li>
                  ))}
                </ul>
              )}

              {result.imported > 0 && (
                <p className="text-sm text-muted-foreground border-t border-border pt-3">
                  {result.imported} project{result.imported !== 1 ? 's' : ''} imported.{' '}
                  <Link href="/projects" className="underline hover:text-foreground">View projects</Link> or{' '}
                  <Link href="/evaluation" className="underline hover:text-foreground">run an evaluation</Link>.
                </p>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
