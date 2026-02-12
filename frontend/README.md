# Immivo Frontend

This is the frontend application for Immivo AI, built with **Next.js 15** and **Tailwind CSS**.

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- npm

### Local Development

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Run the development server:**
    ```bash
    npm run dev
    ```

3.  Open [http://localhost:3000](http://localhost:3000) with your browser.

## 🐳 Deployment Architecture (AWS Lambda)

We deploy this application as a **Docker Container** on **AWS Lambda**, using the [AWS Lambda Web Adapter](https://github.com/awslabs/aws-lambda-web-adapter).

### Why Lambda?
- **Scale to Zero:** Costs $0 when no one is using the app (perfect for Dev/Stage).
- **Infinite Scaling:** Automatically handles traffic spikes.
- **Simplicity:** No need to manage servers or clusters (like ECS/EKS).

### Environment Variables
Since the Docker image is built once and deployed to multiple stages (Dev, Stage, Prod), we cannot "bake in" environment variables at build time using `NEXT_PUBLIC_`.

Instead, we inject them at **runtime** via the Lambda environment configuration.

**How it works:**
1.  **Server-Side:** Next.js reads `process.env` (in `layout.tsx` or API routes).
2.  **Client-Side:** We use a custom `EnvProvider` (`src/components/EnvProvider.tsx`) to pass these variables from the server to the client.
3.  **Usage:** Always use `getRuntimeConfig()` or `useEnv()` instead of accessing `process.env.NEXT_PUBLIC_...` directly in client components.

### Dockerfile
The `Dockerfile` is a multi-stage build optimized for production:
- Uses `node:20-slim` for a small footprint.
- Installs the AWS Lambda Web Adapter extension.
- Copies the standalone Next.js build.

## 🛠 Tech Stack
- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS (Dark Mode support)
- **Auth:** AWS Amplify (Cognito)
- **Icons:** Lucide React
- **State:** Global State Context (Drawer, Sidebar, AI Chat)
- **Features:**
  - Dashboard mit KPIs
  - CRM (Leads, Objekte, Bildupload zu S3)
  - Exposé-Editor mit KI-Unterstützung
  - KI-Bildstudio (Virtual Staging mit Gemini)
  - Jarvis AI Chat (GPT-5-mini)
  - Bug Reports mit Screenshot + Console-Log-Capture
  - Admin Panel (Stats, Tenants, Users, Audit, Health, Bug Reports)