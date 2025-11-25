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
          <button id="help-btn" className="btn-secondary" title="Help">Help</button>
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

      <dialog id="help-modal" className="help-modal">
        <div className="help-modal-content">
          <div className="help-modal-header">
            <h2>Quick Start Guide</h2>
            <button id="help-modal-close" className="help-modal-close" title="Close">×</button>
          </div>
          <div className="help-modal-body">
            <div className="help-step">
              <h3>1. Create a Board</h3>
              <p>Click the <strong>"+ Add"</strong> button in the Boards panel to create your first board with default dimensions.</p>
            </div>
            <div className="help-step">
              <h3>2. Select a Side</h3>
              <p>Select the board from the Boards panel, then click on any side (top, bottom, left, right, front, or back) in the 3D viewport to configure a joint on that side.</p>
            </div>
            <div className="help-step">
              <h3>3. Configure the Joint</h3>
              <p>In the Joints panel, configure your box joint parameters:</p>
              <ul>
                <li><strong>Mode</strong>: Choose Fixed (equal fingers) or Variable (custom widths)</li>
                <li><strong>Finger Width</strong>: Set the width of each finger/gap</li>
                <li><strong>Finger Count</strong>: Number of fingers in the joint</li>
                <li><strong>Groove Depth</strong>: Depth of the cut</li>
              </ul>
            </div>
          </div>
        </div>
      </dialog>
    </div>
  );
}

export default App;
