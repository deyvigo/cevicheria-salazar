import { Component, type ReactNode } from 'react';

interface MapErrorBoundaryProps {
  fallback: ReactNode;
  onError: () => void;
  children: ReactNode;
}

export class MapErrorBoundary extends Component<MapErrorBoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
