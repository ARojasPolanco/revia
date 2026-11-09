'use client';

import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('ErrorBoundary', error, info);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-5 py-12">
          <h1 className="text-2xl font-black tracking-tight text-neutral-900">Algo salió mal</h1>
          <p className="text-sm text-neutral-600">
            Recargá la página o volvé al inicio. Si el problema continúa, escribinos a soporte.
          </p>
          <a className="text-sm font-semibold text-teal-700" href="/">
            Volver al inicio
          </a>
        </main>
      );
    }

    return this.props.children;
  }
}
