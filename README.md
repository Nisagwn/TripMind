# TripMind - AI-Powered Travel Assistant

A modern, colorful travel route web app built with Next.js, Tailwind CSS, and Framer Motion. Create perfect travel routes with an elegant and clean UI that feels like an AI-powered smart travel assistant.

## Features

- 🏠 **Landing Page** - Hero section with explore and create route buttons
- 🗺️ **Places List** - Beautiful cards with name, rating, and images
- 📍 **Place Details** - Detailed view with comments section and booking form
- 🛣️ **Route Creation** - Interactive form with map preview and place management
- ✨ **Smooth Animations** - Framer Motion powered hover effects and transitions
- 🎨 **Modern Design** - Clean, bright UI with custom color palette

## Design System

### Colors
- **Primary Purple**: #6C5CE7
- **Turquoise**: #00BFA6
- **Yellow**: #FFD166
- **Coral Red**: #FF6B6B

### Typography
- **Headings**: Poppins (300, 400, 500, 600, 700)
- **Body Text**: Inter (300, 400, 500, 600, 700)

### Components
- Rounded-2xl cards with soft shadows
- Smooth hover effects with scale and translate transforms
- Gradient backgrounds and modern button styles
- Responsive grid layouts

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS with custom configuration
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Language**: TypeScript

## Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Run Development Server**
   ```bash
   npm run dev
   ```

3. **Open in Browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
├── app/
│   ├── globals.css          # Global styles and Tailwind imports
│   ├── layout.tsx           # Root layout with navigation
│   ├── page.tsx             # Landing page
│   ├── places/
│   │   ├── page.tsx         # Places list page
│   │   └── [id]/
│   │       └── page.tsx     # Place detail page
│   └── create-route/
│       └── page.tsx         # Route creation page
├── components/
│   └── Navigation.tsx       # Main navigation component
├── tailwind.config.js       # Tailwind configuration
└── package.json
```

## Pages Overview

### Landing Page (`/`)
- Hero section with gradient text and call-to-action buttons
- Feature showcase with animated cards
- Statistics section with icons
- Animated background elements

### Places List (`/places`)
- Search and filter functionality
- Responsive card grid layout
- Category filtering and sorting options
- Hover animations and smooth transitions

### Place Detail (`/places/[id]`)
- Image gallery with thumbnail navigation
- Detailed place information and features
- Interactive booking form
- Comments section with rating system
- Add comment functionality

### Route Creation (`/create-route`)
- Route form with name and description
- Drag-and-drop place management
- Search and filter places to add
- Route preview with map placeholder
- Optimize route functionality

## Customization

### Adding New Colors
Update `tailwind.config.js` to add new colors to the theme:

```javascript
colors: {
  yourColor: {
    500: '#YOUR_HEX_CODE',
    // ... other shades
  }
}
```

### Adding New Animations
Use Framer Motion's animation props:

```jsx
<motion.div
  initial={{ opacity: 0, y: 30 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.8 }}
>
  Your content
</motion.div>
```

### Custom Components
Create reusable components in the `components/` directory following the existing patterns.

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

MIT License - feel free to use this project for your own travel applications!
