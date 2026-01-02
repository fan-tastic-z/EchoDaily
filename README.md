<div align="center">

# 📔 Echo Daily

*A minimalist, privacy-focused personal journal with AI assistance*

[![Tauri](https://img.shields.io/badge/Tauri-2.0-FFC131?logo=tauri)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Rust](https://img.shields.io/badge/Rust-Stable-000000?logo=rust)](https://www.rust-lang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

[Features](#-features) • [Installation](#-installation) • [Development](#-development) • [Contributing](#-contributing)

</div>

---

## ✨ Features

### 📝 Rich Journaling
- **Modern Editor**: Built on TipTap with markdown support, code blocks, and more
- **Auto-Save**: Never lose your thoughts with automatic saving
- **Calendar View**: Navigate entries easily with an intuitive calendar interface
- **Mood Tracking**: Record your daily mood with emoji indicators

### 🤖 AI Assistance
- **Text Polish**: Enhance your writing with AI-powered refinement
- **Translation**: Translate content to multiple languages
- **Grammar Fix**: Automatically correct grammar mistakes
- **History**: Track all AI operations for each entry

### 🔊 Text-to-Speech
- **Multiple Providers**: Support for Qwen (阿里云) and Murf.ai
- **Voice Selection**: Choose from various voice options
- **Speed Control**: Adjust playback speed to your preference
- **Audio Playback**: Built-in audio player for listening to your entries

### 📊 Insights
- **Writing Statistics**: Track total entries, current streak, and longest streak
- **Mood Analytics**: Visualize your emotional patterns over time
- **Full-Text Search**: Quickly find entries with powerful search capabilities

### 💾 Data Management
- **Import/Export**: Backup and restore your data as JSON
- **Privacy First**: All data stored locally on your device
- **Cross-Platform**: Available on Windows, macOS, and Linux

---

## 🚀 Installation

### Prerequisites

- **Node.js** 18+ and pnpm
- **Rust** and Cargo
- **System dependencies** for Tauri (see [Tauri Prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites))

### From Source

```bash
# Clone the repository
git clone https://github.com/fan-tastic-z/echo-daily.git
cd echo-daily

# Install dependencies
pnpm install

# Run in development mode
pnpm tauri dev
```

### Pre-built Binaries

Coming soon! Releases will be available on GitHub Releases.

---

## 🛠️ Development

### Project Structure

```
echo-daily/
├── src/                    # Frontend source (React + TypeScript)
│   ├── components/         # React components
│   ├── lib/               # API layer
│   ├── store/             # State management (Zustand)
│   └── types/             # TypeScript types
├── src-tauri/             # Backend source (Rust)
│   ├── src/
│   │   ├── ai/           # AI provider implementations
│   │   ├── db/           # Database queries and migrations
│   │   ├── tts/          # Text-to-speech providers
│   │   └── keychain/     # Secure storage for API keys
│   └── capabilities/      # Tauri capability configurations
└── Cargo.toml            # Rust dependencies
```

### Available Scripts

```bash
# Development
pnpm tauri dev          # Start dev server with hot reload

# Building
pnpm tauri build        # Build production binaries
pnpm build              # Build frontend only

# Type checking
pnpm exec tsc --noEmit  # Check TypeScript types

# Rust
cargo check            # Check Rust code
cargo test             # Run Rust tests
cargo clippy           # Lint Rust code
```

### Tech Stack

**Frontend:**
- **Framework**: React 19 with TypeScript
- **Editor**: TipTap (ProseMirror-based)
- **Styling**: Tailwind CSS
- **State**: Zustand
- **Icons**: Lucide React

**Backend:**
- **Framework**: Tauri 2.0
- **Database**: SQLite with SQLx
- **AI**: 智谱 AI (Zhipu AI)
- **TTS**: Qwen, Murf.ai
- **Security**: Platform keychain for API keys

---

## 📸 Screenshots

> TODO: Add screenshots here

---

## ⚙️ Configuration

### AI Settings

1. Click the wand icon (🪄) in the header
2. Enter your Zhipu AI API key
3. Configure model settings

### TTS Settings

1. Click the speaker icon (🔊) in the header
2. Choose your provider (Qwen or Murf.ai)
3. Enter your API key
4. Select voice and adjust speed

### Data Backup

1. Click the database icon (💾) in the header
2. **Export**: Save all your data as a JSON file
3. **Import**: Restore from a previous backup

---

## 🗺️ Roadmap

- [ ] Cloud sync (self-hosted option)
- [ ] Mobile apps (iOS/Android)
- [ ] Plugin system
- [ ] Custom themes
- [ ] Encryption support
- [ ] More AI providers

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style
- Add tests for new features
- Update documentation as needed
- Keep commits atomic and well-described

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Tauri](https://tauri.app/) - Cross-platform desktop framework
- [TipTap](https://tiptap.dev/) - Rich text editor framework
- [Zhipu AI](https://open.bigmodel.cn/) - AI services provider
- [Lucide](https://lucide.dev/) - Beautiful icons

---

## 📮 Support

- 🐛 [Report a bug](https://github.com/fan-tastic-z/echo-daily/issues)
- 💡 [Request a feature](https://github.com/fan-tastic-z/echo-daily/issues)
- 📖 [Documentation](https://github.com/fan-tastic-z/echo-daily/wiki)

---

<div align="center">

**Made with ❤️ by [fan-tastic-z](https://github.com/fan-tastic-z)**

⭐ Star us on GitHub — it helps!

</div>
