# 🎬 Easy Rek - Professional Screen Recorder

[![Next.js](https://img.shields.io/badge/Next.js-15+-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.1-38bdf8)](https://tailwindcss.com/)

Professional screen recorder with camera overlay, built with Next.js 15, TypeScript, and Shadcn/ui.

---

## ✨ Features

- 🎥 **Screen Recording** - Capture your screen with system audio
- 📷 **Camera Overlay** - Add webcam feed with customizable layouts
- 🎨 **Customizable Layouts** - Multiple shapes, sizes, and backgrounds
- ⏺️ **Multi-Track Recording** - Separate camera, screen, and composite tracks
- ✂️ **Built-in Editor** - Edit your recordings with timeline controls
- 💾 **Multiple Export Options** - Download camera, screen, or composite video
- 🚀 **Next.js 15** - Modern React framework with App Router
- 🎨 **Shadcn/ui** - Beautiful, accessible UI components

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

---

## 📖 Documentation

- **[INSTALACAO.md](INSTALACAO.md)** - Guia completo de instalação (PT-BR)
- **[COMANDOS.md](COMANDOS.md)** - Referência rápida de comandos (PT-BR)
- **[CHECKLIST.md](CHECKLIST.md)** - Checklist de verificação (PT-BR)
- **[MIGRATION_STATUS.md](MIGRATION_STATUS.md)** - Status da migração (PT-BR)

---

## 🛠️ Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript 5.8
- **Styling:** Tailwind CSS 4.1
- **UI:** Shadcn/ui
- **Animation:** Framer Motion
- **Icons:** Lucide React

---

## 📁 Project Structure

```
app/                    # Next.js App Router
components/             # React components
  ├── recorder/         # Main recorder component
  └── ...              # UI components
hooks/                 # Custom React hooks (SSR-safe)
lib/                   # Utility functions
types.ts               # TypeScript types
```

---

## 🎯 Usage

1. **Grant Permissions** - Allow camera and microphone access
2. **Start Screen Sharing** - Select a window or screen to record
3. **Customize Layout** - Adjust camera shape, size, and position
4. **Start Recording** - Click record button
5. **Stop Recording** - Click stop when finished
6. **Preview & Download** - Review and download your recordings

---

## 🎨 Add UI Components

```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add dialog
```

Browse: [ui.shadcn.com](https://ui.shadcn.com/docs/components)

---

## 🚧 Roadmap

- [x] **Phase 1:** Infrastructure Setup
- [x] **Phase 2:** Core Migration ✅ **COMPLETE**
- [ ] **Phase 3:** Database (Neon + Drizzle)
- [ ] **Phase 4:** Storage (Cloudflare R2)
- [ ] **Phase 5:** SaaS Features (Auth, Dashboard)

---

## 👤 Author

**Rafael Bernatat**  
GitHub: [@rafaelbernatat](https://github.com/rafaelbernatat)

---

## 📝 License

MIT License

---

**Made with ❤️ using Next.js and TypeScript**
