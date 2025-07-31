# MAPC Portfolio

A modern React application built with Vite, featuring Tailwind CSS for styling, Mapbox GL for interactive maps, and @mapc/airtable-cms for content management.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Configuration

Before running the application, you'll need to configure the following:

1. **Mapbox Access Token**: 
   - Get a free access token from [Mapbox](https://account.mapbox.com/access-tokens/)
   - Replace `'your-mapbox-access-token-here'` in `src/App.jsx` with your actual token

2. **Airtable CMS Configuration** (optional):
   - Uncomment the Airtable CMS code in `src/App.jsx`
   - Add your Airtable API key, base ID, and table names

### Development

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Building for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
src/
├── App.jsx          # Main application component
├── index.css        # Global styles with Tailwind directives
├── main.jsx         # Application entry point
└── assets/          # Static assets
```

## Technologies Used

- **Vite** - Build tool and dev server
- **React** - UI framework
- **Tailwind CSS** - Styling
- **Mapbox GL** - Interactive maps

## License

This project is licensed under the MIT License.
