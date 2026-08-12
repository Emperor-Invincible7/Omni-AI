'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional label shown in the fallback so users know which surface failed. */
  label?: string;
  /** Called when a child throws — useful for logging. */
  onError?: (err: Error, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

/**
 * Generic React ErrorBoundary. Designed to isolate charting libraries
 * (Recharts) and other unstable renders so a single bad payload doesn't
 * freeze the whole UI.
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info);
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn('[ErrorBoundary]', this.props.label ?? 'component', error.message, info.componentStack);
    }
  }

  reset = () => this.setState({ hasError: false, error: undefined });

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="border p-4 my-2 font-mono text-[11px] tracking-[0.14em] uppercase"
          style={{
            borderColor: 'var(--accent)',
            background: 'var(--bg-elev-1)',
            color: 'var(--accent)',
          }}
          role="alert"
        >
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={12} />
            <span>{this.props.label ?? 'RENDER_FAILURE'}</span>
          </div>
          <p
            className="normal-case tracking-normal text-[11px] leading-relaxed"
            style={{ color: 'var(--text-dim)' }}
          >
            {this.state.error?.message ?? 'An unknown render error occurred.'}
          </p>
          <button
            onClick={this.reset}
            className="mt-3 px-2 py-1 border font-mono text-[10px] tracking-[0.18em] uppercase"
            style={{
              borderColor: 'var(--accent)',
              color: 'var(--accent)',
              background: 'transparent',
            }}
          >
            RETRY
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}