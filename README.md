# Maneuver - Advanced FRC Scouting Application

A comprehensive, mobile-first scouting application for FIRST Robotics Competition (FRC) teams. Maneuver provides powerful tools for match scouting, team analysis, pit scouting, alliance selection, and data management.


## 🚀 Features


- **Comprehensive Data Collection**: Track autonomous, teleop, and endgame performance with real-time input
- **Interactive Field Maps**: Visual interfaces for starting positions and strategy
- **2025 Game Support**: Coral scoring (4 levels), algae management, climb analysis
- **Match Strategy Integration**: Import match data from The Blue Alliance API and Nexus
- **Field Canvas**: Draw and annotate match strategies, auto-fill by match number

- **Multi-Tab Dashboard**: Detailed performance metrics across Overall, Auto, Teleop, and Endgame phases
- **Advanced Analytics**: Strategy overview with filtering, sorting, charts, and multiple aggregation types
- **Team Comparisons**: Side-by-side analysis with visual indicators and statistical significance
- **Position Analysis**: Field maps showing starting position preferences and success rates
- **Alliance Selection**: Drag-and-drop pick lists, desktop/mobile layouts, alliance initializer, and selection tables


### 🏆 Scout Profiles & Achievements
- **Persistent Scout Profiles**: Stake tracking, prediction scoring, and achievement system
- **Achievements**: Unlockable badges and progress tracking for scouts

### 🏗️ Pit Scouting & Assignments
- **Full Pit Scouting UI**: Forms for robot specs, photos, auto/teleop/endgame, technical notes
- **Pit Assignment Tools**: Assignment controls, event configuration, pit map visualization, spatial clustering

### 📱 Data Management & Transfer
- **Flexible Transfer**: JSON files and fountain codes for large datasets
- **Local Storage**: Persistent data with merge/overwrite capabilities (IndexedDB via Dexie)

### 🛠️ Technology Stack

- **Frontend**: React 19 with TypeScript
- **Build Tool**: Vite (dev server + build)
- **UI Framework**: Tailwind CSS with shadcn/ui primitives
- **Local DB**: Dexie (IndexedDB) — `src/lib/dexieDB.ts` is authoritative
- **Data Transfer**: Luby Transform fountain codes (QR), JSON import/export
- **PWA**: vite-plugin-pwa with service worker runtime caching
- **Analytics**: Google Analytics 4 (lightweight wrapper at `src/lib/analytics`)

```

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm (preferred) or yarn

## 📖 Usage

### Quick Start

1. **Demo Data**: Click "Load Demo Data" on homepage to explore all features
2. **Core Workflows**: Match scouting → Team analysis → Strategy planning → Alliance selection
3. **Data Transfer**: Use QR codes or JSON files to share data between devices

### Key Workflows

**Match Scouting**: Game Start → Auto Phase → Teleop → Endgame → Submit

**Team Analysis**: Select team → View multi-tab statistics → Compare with others → Analyze positions
**Strategy Planning**: Dashboard overview → Interactive charts → Column configuration → Event filtering

**Alliance Selection**: Create pick lists → Research teams → Drag-and-drop ordering → Export/share
**Pit Scouting**: Assign scouts → Fill out pit forms → Visualize pit map → Export pit data
**Achievements**: Track scout progress, unlock badges, and view leaderboard

## 🏗️ Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── AutoComponents/     # Autonomous phase components
│   ├── DashboardComponents/ # Main dashboard elements
│   ├── DataTransferComponents/ # Import/export functionality
│   ├── TeamStatsComponents/ # Team analysis tools
│   ├── StrategyComponents/ # Strategy overview and analysis
│   ├── PickListComponents/ # Alliance selection tools
│   ├── MatchStrategyComponents/ # Match planning tools
│   ├── PitScoutingComponents/ # Pit scouting forms and displays
│   ├── PitAssignmentComponents/ # Pit assignment and mapping
│   └── ui/                # Base UI components (shadcn/ui)
├── pages/              # Application pages/routes
├── lib/                # Utility functions and helpers
├── hooks/              # Custom React hooks
├── assets/             # Images and static files
└── layouts/            # Page layout components
```

## 🔧 Architecture & Developer Notes

- **Database is authoritative**: Most app state and exports/imports flow through `src/lib/dexieDB.ts` (`db`, `pitDB`, `gameDB`).

## 🤝 Contributing

We welcome contributions to Maneuver! Here's how you can help:

---

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes**: Follow the existing code style and patterns
4. **Test thoroughly**: Ensure all features work as expected
5. **Submit a pull request**: Describe your changes and their benefits
### Development Guidelines
- Use TypeScript for type safety
- Follow React best practices and hooks patterns
- Maintain responsive design for mobile compatibility
- Test data transfer features thoroughly
- Document any new features or changes

### PR checklist
- Run typecheck: `npm run build` and fix errors.
- Run linter: `npm run lint` and fix issues.
- Smoke test: `npm run dev` → verify affected pages; if DB touched, confirm migration helpers/backups work.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **FIRST Robotics Competition** for inspiring this project
- **VihaanChhabria** and the [VScout project](https://github.com/VihaanChhabria/VScout) for providing the initial foundation and inspiration for this application
- **The Blue Alliance** for providing match data APIs
- **shadcn/ui** for the excellent component library
- **Luby Transform** library for robust data transfer capabilities

## 📞 Support

For questions, issues, or feature requests:
- Open an issue on GitHub
- Contact the development team
- Check the documentation and demo data for examples

---

**Built with ❤️ for the FRC community**

*Maneuver helps teams make data-driven decisions and improve their competitive performance through comprehensive scouting and analysis tools.*
