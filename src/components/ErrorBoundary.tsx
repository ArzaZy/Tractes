import { Component, type ErrorInfo, type ReactNode } from 'react'

interface State {
  failed: boolean
}

/** Prevents a render error from leaving visitors on a blank screen. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Details stay in the console; nothing internal is shown on screen.
    console.error('Unhandled UI error', error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div role="alert" className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-2xl font-semibold text-fg">Something went wrong</h1>
        <p className="text-sm text-muted">An unexpected error occurred. Reloading the page usually fixes it.</p>
        <div className="flex gap-2">
          <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
            Reload page
          </button>
          <a className="btn btn-secondary" href="/">
            Go home
          </a>
        </div>
      </div>
    )
  }
}
