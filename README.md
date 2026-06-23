# Togo Insight R1.5

Next.js rebuild of the Togo Insight telecom analytics platform, designed to run on
**Microsoft Azure**. It keeps the same logic as the V2 dashboard (CSV in → Azure
Blob Storage → processed Lillybelle/ARCEP outputs) and adds:

- ⚡️ **Next.js (App Router) + TypeScript**
- 🔐 **Sign in with Microsoft (Entra ID)** _and_ classic email/password (NextAuth)
- 🗄️ **Azure Database for PostgreSQL** via Prisma for users / file metadata / contacts
- ☁️ **Azure Blob Storage** for uploads and processed files
- 📊 **Power BI Embedded** dashboards (your real workspace report)
- 🎨 The same navy + cyan "5G" theme, plus a Chatbase-style account dashboard

---

## ⚡ Run locally — no keys needed

The app runs end-to-end with **zero external services**. With no env vars set it
automatically uses a local JSON database, the local filesystem for uploads, and a
simulated processing step:

```bash
npm install
npm run dev          # http://localhost:3000
```

Then sign in with the seeded demo account (or click **Sign up**):

```
email:    demo@togoinsight.local
password: demo1234
```

What works with no keys:
| Service | Keyless fallback |
| --- | --- |
| Database (PostgreSQL) | JSON file at `.data/db.json` (auto-created, demo user seeded) |
| Uploads (Azure Blob) | Local filesystem at `.data/storage/` |
| Processing pipeline | Simulated — outputs are generated instantly so upload → **Ready** → download works |
| Login with Microsoft (Entra) | Button hidden; use email/password |
| Power BI dashboards | "Connect Power BI" placeholder (the rest of the app is fully usable) |

`npm run dev` loads `.env.development` (a committed file with only a throwaway
session secret — not a service key). To switch on a real Azure service, set its
keys in a `.env.local` (gitignored) and restart; each one is detected
independently. Delete `.data/` any time to reset local data.

---

## Architecture

```
            ┌─────────────┐      upload CSV      ┌──────────────────────┐
 Browser ── │  Next.js     │ ───────────────────▶ │ Azure Blob: INPUT/    │
            │  (App Router)│                      └──────────┬───────────┘
            │              │                                 │ external pipeline
            │  NextAuth ───┼── Entra ID (Microsoft login)    ▼
            │  Prisma  ────┼── PostgreSQL             ┌──────────────────────┐
            │  PowerBI ────┼── Power BI Embedded ◀─── │ Azure Blob: OUTPUT/   │
            └─────────────┘                          └──────────┬───────────┘
                                                                ▼
                                                         Power BI dataset → report
```

- **Upload** (`/dashboard`): drag & drop a CSV → stored at `INPUT/<name>` in your
  container. Three DB rows are created: the original + `lillybelle` / `arcep`
  output placeholders.
- A background pipeline (e.g. Snowflake) writes processed **XLSX** to `OUTPUT/`.
  The app polls `GET /api/files/refresh/:reference` and flips outputs to *Ready*.
- **Dashboards** (`/dashboard/dashboards`): embeds your Power BI report with a
  filter bar (plus Power BI's own filter pane).
- **History** (`/dashboard/history`): uploads grouped by reference with download links.

---

## Prerequisites

- Node.js 20+ (22 LTS recommended)
- An Azure subscription with: **Storage account**, **Azure Database for PostgreSQL**,
  an **Entra ID app registration** (for login), and a **Power BI** workspace +
  **service principal** (for embedding).

---

## 1) Enabling Azure services (optional)

The keyless quick start above is all you need to develop. When you're ready to
wire real Azure services, add their keys to a **`.env.local`** (gitignored):

```bash
cp .env.example .env.local    # fill in only the services you want to enable
npm run db:push               # ONLY if you set DATABASE_URL (creates PostgreSQL tables)
npm run dev
```

Each service activates independently as soon as its keys are present:
- `DATABASE_URL` → switches from the JSON store to Azure PostgreSQL (Prisma)
- `AZURE_STORAGE_CONNECTION_STRING` → uploads go to Azure Blob (no more local simulation)
- `AZURE_AD_*` → the "Sign in with Microsoft" button appears
- `POWERBI_*` → the Dashboards tab embeds your real report

> `npm install` runs `prisma generate` automatically (postinstall).

### Drop your logo
Put your real logo at **`public/logo.png`** — it overrides the placeholder
everywhere. See `public/PLACE_ASSETS_HERE.md`.

---

## 2) Environment variables

All keys live in `.env` locally and in **Azure App Service → Configuration →
Application settings** in production. See `.env.example` for the full list.

| Key | What it is |
| --- | --- |
| `NEXTAUTH_URL` | App base URL (`http://localhost:3000` or your `*.azurewebsites.net`) |
| `NEXTAUTH_SECRET` | Random secret — `openssl rand -base64 32` |
| `DATABASE_URL` | PostgreSQL connection string (Prisma `postgresql://…`) |
| `AZURE_AD_CLIENT_ID` / `AZURE_AD_CLIENT_SECRET` / `AZURE_AD_TENANT_ID` | Entra ID app for "Login with Microsoft" |
| `AZURE_STORAGE_CONNECTION_STRING` | Storage account connection string |
| `AZURE_STORAGE_CONTAINER` | Container name (default `prodtogodata`) |
| `POWERBI_TENANT_ID` / `POWERBI_CLIENT_ID` / `POWERBI_CLIENT_SECRET` | Power BI service principal |
| `POWERBI_WORKSPACE_ID` / `POWERBI_REPORT_ID` / `POWERBI_DATASET_ID` | Report to embed |

---

## 3) Azure services

### Entra ID (Microsoft login)
1. **Entra ID → App registrations → New registration.**
2. Add a **Web** redirect URI: `<NEXTAUTH_URL>/api/auth/callback/azure-ad`
   (add both `http://localhost:3000/...` and your production URL).
3. **Certificates & secrets → New client secret.**
4. Copy the **client id**, **secret**, and **tenant id** into the `AZURE_AD_*` vars.

### Azure Database for PostgreSQL
1. Create an **Azure Database for PostgreSQL — Flexible Server**. Add a firewall
   rule for your IP and enable "Allow public access from Azure services".
2. Put the connection string in `DATABASE_URL` (Prisma `postgresql` format with
   `?sslmode=require` — see `.env.example`).
3. Run `npm run db:push` to create the tables.

### Azure Blob Storage
1. Create a **Storage account** and a **container** (default `prodtogodata`).
2. Copy its connection string into `AZURE_STORAGE_CONNECTION_STRING`.
3. The app reads/writes the `INPUT/` and `OUTPUT/` virtual folders inside it.

### Power BI Embedded
1. Create an **Entra app (service principal)** for Power BI.
2. In the **Power BI admin portal**, enable *"Allow service principals to use
   Power BI APIs"* (optionally scope to a security group containing the SP).
3. In your **Power BI workspace → Access**, add the service principal as
   **Member** (or Admin).
4. Copy the workspace id, report id (and dataset id) from the report URL/settings
   into the `POWERBI_*` vars.

> Until `POWERBI_*` is set, the Dashboards tab shows a friendly "Connect Power BI"
> placeholder instead of erroring.

---

## 4) Deploy to Azure App Service

> 📘 **Full step-by-step (Portal + CLI), including the PostgreSQL Flexible Server,
> Storage, app settings and schema push: [DEPLOY_AZURE.md](DEPLOY_AZURE.md).**

1. Create a **Web App** (Linux, **Node 22 LTS**).
2. Set **all** environment variables in *Configuration → Application settings*
   (don't forget `NEXTAUTH_URL` = your real URL).
3. Deploy the code (GitHub Actions, `az webapp up`, or VS Code Azure extension).
   Oryx runs `npm install` + `npm run build` automatically.
4. Set the **startup command** to:
   ```
   npm run start
   ```
5. Add the production redirect URI to the Entra app, and add the production URL
   to any storage/SQL firewall rules as needed.

> Prefer containers? Uncomment `output: "standalone"` in `next.config.js` and
> build a Docker image around `.next/standalone`.

---

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | `prisma generate` + production build |
| `npm run start` | Run the production server |
| `npm run db:push` | Push the Prisma schema to Azure PostgreSQL |
| `npm run db:studio` | Open Prisma Studio |

---

## Project structure

```
src/
├── app/
│   ├── (marketing)/        # home, about, contact (+ shared navbar/footer)
│   ├── (auth)/             # login, signup (Microsoft + email/password)
│   ├── dashboard/          # protected account area
│   │   ├── page.tsx        # Files: upload + list + filters + summary rail
│   │   ├── dashboards/     # Power BI report + filter bar
│   │   └── history/        # uploads grouped by reference
│   └── api/                # signup, upload, files, download, contact, powerbi, auth
├── components/             # Navbar, Footer, Particles, Logo, PowerBIReport, dashboard/*
└── lib/                    # auth, prisma, azure-storage, powerbi, session, countries
```

Built by Lillybelle · Togo Insight R1.5
