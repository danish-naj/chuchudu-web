import React from 'react';
import ReactDOM from 'react-dom/client';
import { AgentApp } from './AgentApp';
import './style.css';

// Capture any unhandled errors before or during app boot
window.addEventListener('error', (e) => {
  console.error('[Chuchudu Boot Error]:', e.error || e.message);
  const root = document.getElementById('root');
  if (root && (!root.innerHTML || root.innerHTML.trim() === '')) {
    root.innerHTML = `
      <div style="padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #ffffff; color: #1a1c1c; min-height: 100vh;">
        <h2 style="color: #ba1a1a; font-size: 20px; font-weight: 800; margin-bottom: 8px;">Startup Error</h2>
        <p style="margin-bottom: 16px; color: #454937; font-size: 14px;">An error occurred while loading the application:</p>
        <pre style="background: #f3f3f3; padding: 16px; border: 2px solid #1a1c1c; font-size: 12px; overflow: auto; white-space: pre-wrap; font-family: monospace;">${e.message || e.error}\n${e.filename || ''}:${e.lineno || ''}</pre>
        <button onclick="window.location.reload()" style="margin-top: 16px; background: #506600; color: #ffffff; border: 2px solid #1a1c1c; padding: 10px 20px; font-weight: bold; cursor: pointer; text-transform: uppercase;">Retry</button>
      </div>
    `;
  }
});

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  state: { hasError: boolean; error: any } = { hasError: false, error: null };
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: any) { console.error('[Chuchudu Component Crash]:', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 32, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", background: '#ffffff', color: '#1a1c1c', minHeight: '100vh' }}>
          <h2 style={{ color: '#ba1a1a', fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Chuchudu Desktop Agent Error</h2>
          <p style={{ marginBottom: 16, color: '#454937', fontSize: 14 }}>The application encountered an unexpected error:</p>
          <pre style={{ background: '#f3f3f3', padding: 16, border: '2px solid #1a1c1c', fontSize: 12, overflow: 'auto', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
            {this.state.error?.stack || this.state.error?.message}
          </pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: 16, background: '#506600', color: '#ffffff', border: '2px solid #1a1c1c', padding: '10px 20px', fontWeight: 'bold', cursor: 'pointer', textTransform: 'uppercase' }}>
            Reload Application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AgentApp />
    </ErrorBoundary>
  </React.StrictMode>
);
