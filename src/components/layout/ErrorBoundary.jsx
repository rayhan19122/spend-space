import { Component } from 'react'
import { ErrorState } from '../common/Card.jsx'

export class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-dvh items-center justify-center bg-bg">
          <ErrorState
            title="Something went wrong"
            error={this.state.error}
            onRetry={() => window.location.reload()}
          />
        </div>
      )
    }
    return this.props.children
  }
}
