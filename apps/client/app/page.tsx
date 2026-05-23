import { redirect } from 'next/navigation';

/**
 * Root page — immediately redirects to /projects.
 * This is a server component; no client-side JS is needed.
 */
export default function RootPage(): never {
  redirect('/projects');
}
