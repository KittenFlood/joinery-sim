# JoinerySim - Box Joints Designer

A web-based 3D design tool for creating and visualizing box joints (finger joints) in woodworking projects. This application allows you to design boards, configure joints on different sides, and visualize the final assembly in an interactive 3D viewport.

## Features

- **3D Visualization**: Interactive Three.js-powered 3D viewport with camera controls
- **Board Management**: Create, edit, and delete boards with customizable dimensions, positions, and rotations
- **Joint Configuration**: Design box joints (finger joints) on any side of a board with configurable parameters:
  - Finger width and count
  - Center keyed joints
  - Groove depth
  - Fixed or variable joint modes
- **Material Library**: Choose from different wood types (ash, cherry) with realistic textures
- **Grain Direction**: Configure wood grain direction for realistic material appearance
- **Project Management**: 
  - Save projects to browser localStorage
  - Export/Import projects as JSON files
  - Undo/Redo functionality (up to 50 history states)
- **Real-time Updates**: See changes reflected immediately in the 3D visualization

## Tech Stack

- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5
- **3D Rendering**: Three.js
- **CSG Operations**: three-csg-ts (Constructive Solid Geometry for joint cutting)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **State Management**: Custom StateManager with history tracking

## Prerequisites

- **Node.js**: Version 18 or higher
- **npm**: Version 9 or higher (comes with Node.js)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd joinery-sim
```

2. Install dependencies:
```bash
npm install
```

## Development

### Running the Development Server

Start the development server with hot module replacement:

```bash
npm run dev
```

The application will be available at `http://localhost:5173` (or the next available port).

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking

### Project Structure

```
joinery-sim/
├── src/
│   ├── App.tsx                 # Main React component
│   ├── main.tsx                # React entry point
│   ├── main.js                 # Application initialization and event handlers
│   ├── generators/
│   │   ├── BoxJointGenerator.js    # Box joint geometry generation
│   │   └── ValidationUtils.js      # Joint validation logic
│   ├── models/
│   │   ├── Board.js            # Board model class
│   │   └── JointConfig.js      # Joint configuration model
│   ├── rendering/
│   │   ├── Scene3D.js          # Three.js scene setup and controls
│   │   ├── JointVisualizer.js  # CSG operations and visualization
│   │   └── MaterialLibrary.js  # Wood material and texture management
│   ├── ui/
│   │   ├── BoardEditor.js      # Board editing UI component
│   │   └── JointEditor.js      # Joint editing UI component
│   ├── utils/
│   │   └── StateManager.js    # State management with history
│   └── textures/
│       ├── woodmap_ash.png     # Ash wood texture
│       └── woodmap_cherry.png  # Cherry wood texture
├── dist/                       # Production build output
├── index.html                  # HTML entry point
├── vite.config.ts             # Vite configuration
├── tailwind.config.js         # Tailwind CSS configuration
└── package.json               # Dependencies and scripts
```

## Usage

### Creating a Board

1. Click the "+ Add" button in the Boards panel
2. A new board will be created with default dimensions
3. Select the board to edit its properties:
   - Dimensions (width, height, thickness)
   - Position (x, y, z coordinates)
   - Rotation (x, y, z angles)
   - Wood type (ash or cherry)
   - Grain direction (width, height, or thickness)

### Configuring Joints

1. Select a board from the Boards panel
2. Click on a side (top, bottom, left, right, front, back) in the 3D viewport
3. Configure the joint in the Joints panel:
   - **Mode**: Fixed (equal fingers) or Variable (custom finger widths)
   - **Finger Width**: Width of each finger/gap
   - **Finger Count**: Number of fingers
   - **Center Keyed**: Whether the joint is centered with a key
   - **Start Offset**: Starting position for variable joints
   - **Groove Depth**: Depth of the cut

### Saving and Loading Projects

- **Save**: Click "Save" or press `Ctrl+S` to save to browser localStorage
- **Export**: Click "Export" to download project as JSON file
- **Import**: Click "Import" to load a project from JSON file

### Keyboard Shortcuts

- `Ctrl+Z` - Undo
- `Ctrl+Y` - Redo
- `Ctrl+S` - Save

## Building for Production

Build the application for production:

```bash
npm run build
```

The production build will be output to the `dist/` directory, optimized and minified for deployment.

Preview the production build locally:

```bash
npm run preview
```

## Deployment

### Static Hosting

This is a static web application that can be deployed to any static hosting service

### Build Configuration

The build process:
- Bundles and minifies JavaScript
- Optimizes CSS with Tailwind
- Processes and optimizes images
- Generates production-ready static assets

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

Note: WebGL support is required for 3D rendering.

## Disclaimer

This is a personal project created to assess certain modern development tools. 
Code is flawed and has security and performance issues.
It has no pretense of being actually used for real stuff, so do not depend on its precision :)

## License

MIT License

