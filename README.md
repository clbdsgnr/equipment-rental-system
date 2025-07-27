# Rental Site

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/calebcarrijom-9190s-projects/v0-rental-site)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.dev-black?style=for-the-badge)](https://v0.dev/chat/projects/aomudzHmAmq)

## ✨ Overview

Web system for managing equipment rentals, developed with an interface generated via [V0.dev](https://v0.dev/) and backend powered by [Supabase](https://supabase.com/).

This project aims to simplify the control of available equipment for rental, as well as user and usage report management.

Main features:

- Modern interface with components generated using V0
- User authentication via Supabase Auth
- Equipment registration and editing
- Rental records
- Reports and history
- Admin dashboard with user management

## 🧰 Technologies Used

- [Next.js](https://nextjs.org/) (App Router)
- [Supabase](https://supabase.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [V0.dev](https://v0.dev/)
- [TypeScript](https://www.typescriptlang.org/)

## 📦 How to Use the Code

If you'd like to **clone, explore, or reuse** this project:

```bash
git clone https://github.com/your-username/equipment-rental-system.git
cd equipment-rental-system
pnpm install
pnpm dev
```
> ⚠️ This project relies on environment variables to connect to Supabase. You must create a `.env.local` file with your Supabase keys to run it properly.

Example:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 🛠️ About Development with V0.dev

The interface was built using [V0.dev](https://v0.dev/), a UI generator that transforms prompts into code based on shadcn/ui and Tailwind CSS.

After generating the components, integration with Supabase was added to create a fully functional and modern system.

## 🔐 Backend with Supabase

Supabase was used for:

- User authentication (email/password)
- Relational database (PostgreSQL)
- Access rules and security with Row Level Security (RLS)
