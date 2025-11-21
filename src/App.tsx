import githubIcon from './github-mark.svg';

function App() {
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Box Joints Designer</h1>
        <div className="header-github">
          <a 
            href="https://github.com/KittenFlood/joinery-sim/blob/main/README.md" 
            target="_blank" 
            rel="noopener noreferrer"
            className="github-link"
            title="View README on GitHub"
          >
            <img src={githubIcon} alt="GitHub" className="github-icon" />
          </a>
        </div>
        <div className="header-actions">
          <button id="undo-btn" className="icon-btn" title="Undo (Ctrl+Z)">↶</button>
          <button id="redo-btn" className="icon-btn" title="Redo (Ctrl+Y)">↷</button>
          <button id="save-btn" className="btn-primary" title="Save (Ctrl+S)">Save</button>
          <button id="export-btn" className="btn-primary" title="Export to JSON">Export</button>
          <button id="import-btn" className="btn-secondary" title="Import from JSON">Import</button>
        </div>
      </header>

      <div className="app-content">
        <aside className="left-panel">
          <div className="panel-header">
            <h2>Boards</h2>
            <div className="panel-header-actions">
              <label className="toggle-label">
                <input type="checkbox" id="transparency-toggle" />
                <span>Show All Opaque</span>
              </label>
              <button id="deselect-all-btn" className="btn-secondary">Deselect All</button>
              <button id="clear-scene-btn" className="btn-secondary">Clear</button>
              <button id="add-board-btn" className="btn-secondary">+ Add</button>
            </div>
          </div>
          <div id="board-list" className="board-list"></div>
        </aside>

        <main className="viewport-container">
          <div id="viewport"></div>
        </main>

        <aside className="right-panel">
          <div className="panel-header">
            <h2>Joints</h2>
          </div>
          <div id="joint-editor" className="joint-editor"></div>
        </aside>
      </div>
    </div>
  );
}

export default App;
