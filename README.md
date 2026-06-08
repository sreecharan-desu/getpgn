# GetPGN

GetPGN is a state-of-the-art AI-powered chess scoresheet digitizer. It allows players, arbiters, and organizers to instantly convert handwritten chess scoresheets (in photos or scans) into standard PGN (Portable Game Notation) files. 

Powered by Next.js 15, Prisma, python-chess validation, and advanced Gemini Multimodal models, GetPGN offers a seamless, modern, light-themed web interface for uploading, validating, playing through, and sharing chess games.

## Features

- **AI Digitization**: Instantly extracts move-lists from handwritten scoresheets using advanced multimodal models.
- **Move Validation**: Integrates logic (using custom python scripts) to validate legality of chess moves, track positions, and generate clean FEN notations.
- **Interactive Chessboard**: View and play through your digitized chess game side-by-side using Chessground and `chess.js`.
- **Easy Sharing**: Generate unique, public shareable links for your games so you can showcase them.
- **Game History & Search**: Save all your processed games to a personal dashboard with title searches.
- **Premium Subscription**: Premium tier powered by Razorpay subscriptions for unlimited scoresheet scans.

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TailwindCSS, Chessground, Lucide Icons
- **Backend / DB**: Next.js Server Actions & API Routes, PostgreSQL, Prisma ORM
- **AI Integration**: Google GenAI SDK (Gemini 2.5 Flash / Gemini 2.0)
- **Email Service**: Resend (auth emails, forgot-password, magic links)
- **Payments**: Razorpay Subscriptions (Standard Monthly & Yearly)
- **Verification Engine**: Python 3 backend runner with `python-chess` for game legality validation.

---

## Getting Started

### Prerequisites

1. **Node.js**: v18.x or higher
2. **Python**: v3.10+ (needed for executing move validation scripts)
3. **PostgreSQL**: Local database instance or a managed service (e.g. Neon)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/sreecharan-desu/getpgn.git
   cd getpgn
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

3. Set up the Python virtual environment and dependencies:
   ```bash
   python -m venv venv
   source venv/bin/activate # On Windows: venv\Scripts\activate
   pip install python-chess
   ```

4. Environment Setup:
   Copy the example environment file and configure the variables:
   ```bash
   cp .env.example .env
   ```

   Fill in the required keys:
   - `DATABASE_URL`: Your PostgreSQL connection string.
   - `AI_API_KEY`: Your Google Gemini API Key.
   - `JWT_SECRET`: Random hash for JWT authentication.
   - `RESEND_API_KEY`: API Key from Resend.
   - `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`: Razorpay keys.

5. Initialize Database:
   ```bash
   npx prisma db push
   npx prisma generate
   ```

6. Start Development Server:
   ```bash
   npm run dev
   ```

   Visit `http://localhost:3000` to access the application.

---

## Deployment to Vercel

This application is fully compatible and optimized for Vercel deployment. 

### Vercel Build Setup

1. **Python Dependency**: The validation engine uses Python. Vercel automatically supports running Python scripts if Python is requested, but for serverless routes invoking Python, we run it as a subprocess. Ensure you do not depend on system binary packages that require complex compilation.
2. **Environment Variables**: Make sure to add all environment variables listed in your `.env` to the Vercel Project Dashboard.
3. **Database Migration**: Ensure the database schema is updated before deployment or run `npx prisma db push` as part of your Vercel build command:
   ```bash
   npx prisma generate && next build
   ```

---

## License

Personal project of [Sreecharan Desu](https://github.com/sreecharan-desu).
