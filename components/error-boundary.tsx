"use client"

import React from "react"

type ErrorBoundaryProps = {
  children: React.ReactNode
}

type ErrorBoundaryState = {
  hasError: boolean
  message: string
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, message: "" }
  }

  public static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const message = error instanceof Error ? error.message : "Erreur inattendue"
    return { hasError: true, message }
  }

  public componentDidCatch(error: unknown, errorInfo: React.ErrorInfo): void {
    console.error("[KIFSHOP] ErrorBoundary caught:", error, errorInfo)
  }

  private handleReload = () => {
    window.location.reload()
  }

  public render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-svh items-center justify-center p-4">
          <div className="max-w-md space-y-4 text-center">
            <h2 className="text-xl font-bold text-foreground">Une erreur est survenue</h2>
            <p className="text-sm text-muted-foreground">{this.state.message}</p>
            <button
              type="button"
              onClick={this.handleReload}
              className="rounded-md border border-border bg-background px-4 py-2 text-sm hover:bg-muted"
            >
              Recharger l'application
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
