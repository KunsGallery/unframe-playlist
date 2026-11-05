import { Component } from 'react';

const RELOAD_KEY = 'up:chunk-reload-at';
const CHUNK_ERROR = /dynamically imported module|Importing a module script failed|error loading dynamically/i;

// After a deploy, an open tab can request script files that no longer exist. One reload fixes that.
function reloadForNewDeploy() {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (Date.now() - last < 30000) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch { return false; }
  window.location.reload();
  return true;
}

export default class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() { return { failed: true }; }

  componentDidCatch(error) {
    if (CHUNK_ERROR.test(error?.message || '')) reloadForNewDeploy();
    else console.error(error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <section className="up-listening-page" role="alert">
        <h1>화면을 불러오지 못했습니다.</h1>
        <p>새로고침하면 대부분 해결됩니다. 문제가 계속되면 잠시 후 다시 시도해 주세요.</p>
        <button type="button" className="is-primary" onClick={() => window.location.reload()}>새로고침</button>
      </section>
    );
  }
}
