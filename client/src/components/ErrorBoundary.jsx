import React from "react";
import { T, btn } from "../theme.js";

/**
 * Catches render-time errors in any surface and shows a recoverable
 * fallback instead of a blank screen.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Log for diagnostics; nothing sensitive is included.
    console.error("UI error boundary caught:", error?.message, info?.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div
        role="alert"
        style={{
          background: T.panel,
          border: `1px solid ${T.red}`,
          borderRadius: 10,
          padding: 24,
          textAlign: "center",
          color: T.chalk,
        }}
      >
        <p style={{ marginTop: 0 }}>Something went wrong rendering this section.</p>
        <button style={btn(T.blue)} onClick={() => this.setState({ hasError: false })}>
          Try again
        </button>
      </div>
    );
  }
}
