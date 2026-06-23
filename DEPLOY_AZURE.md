
# Deploying Togo Insight R1.5 to Azure

This guide walks you through deploying the app to **Azure App Service** with an
**Azure Database for PostgreSQL – Flexible Server**, plus the Storage / Entra ID /
Power BI wiring.

---

## Separate resources vs. "Web App + Database"?

| Approach | When to use |
| --- | --- |
| **Create resources separately** ✅ recommended | Full control of region, SKU (cheap **Burstable** tier), naming, and networking. Clearer to learn. Public access + firewall = simplest & cheapest. |
| **Portal "Web App + Database" wizard** | Fastest one-shot setup; auto-creates VNet + Private Endpoint + Private DNS and wires a connection string. But it uses pricier defaults and stores the connection string under a name like `AZURE_POSTGRESQL_CONNECTIONSTRING` in libpq format — you still must add a Prisma-format **`DATABASE_URL`** yourself. |

> This guide uses the **separate** approach. If you use the wizard, skip to
> [§5 App settings](#5-configure-app-settings-env-vars) and just add `DATABASE_URL`.

You will create **3 resources** in one resource group:
1. Azure Database for PostgreSQL – Flexible Server (the database)
2. Azure Storage account (file uploads)
3. App Service Web App (the Next.js app)

---

## 0. Prerequisites

- An Azure subscription
- [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli) (`az`) — or use the Portal
- Node 20+ locally (Node 22 LTS recommended, to match Azure)
- This repo, building cleanly (`npm install && npm run build`)

Pick names/region once (used throughout):

```
RG=togo-insight-rg
LOC=westeurope
PG=togo-insight-pg          # must be globally unique
APP=togo-insight-web        # must be globally unique
STG=togoinsightstg$RANDOM   # storage name: 3-24 lowercase letters/numbers, unique
DB=togo_insight
```

---

## Option A — Azure CLI (fast, copy‑paste)

```bash
az login
az group create -n $RG -l $LOC

# 1) PostgreSQL Flexible Server + database + "allow Azure services" firewall rule
az postgres flexible-server create \
  --resource-group $RG --name $PG --location $LOC \
  --admin-user pgadmin --admin-password '<StrongPassw0rd!>' \
  --tier Burstable --sku-name Standard_B1ms \
  --storage-size 32 --version 16 \
  --database-name $DB \
  --public-access 0.0.0.0          # special rule = allow other Azure services

# (optional) also allow YOUR current IP so you can run migrations from your laptop
az postgres flexible-server firewall-rule create \
  --resource-group $RG --name $PG \
  --rule-name myip --start-ip-address <your.ip> --end-ip-address <your.ip>

# 2) Storage account + container
az storage account create -g $RG -n $STG -l $LOC --sku Standard_LRS
az storage container create --account-name $STG --name prodtogodata --auth-mode login

# 3) Web App (Linux, Node 22 LTS) — deploys the current folder via Oryx build
az webapp up -g $RG -n $APP -l $LOC --runtime "NODE:22-lts" --sku B1

# 4) Startup command
az webapp config set -g $RG -n $APP --startup-file "npm run start"
```

Get the connection strings you'll need:

```bash
# Storage connection string
az storage account show-connection-string -g $RG -n $STG --query connectionString -o tsv
```

Then set app settings — see [§5](#5-configure-app-settings-env-vars) — and run the
DB schema push from [§6](#6-create-the-database-tables).

---

## Option B — Azure Portal (click‑through)

### 1. Resource group
Portal → **Resource groups → Create** → name `togo-insight-rg`, pick your region.

### 2. PostgreSQL – Flexible Server
**Create a resource → Azure Database for PostgreSQL → Flexible Server.**
- Resource group: `togo-insight-rg`
- Server name: `togo-insight-pg` (unique)
- Region: same as everything else
- PostgreSQL version: **16**
- Workload / Compute: **Burstable → B1ms** (cheapest; scale up later)
- Storage: 32 GB
- Authentication: **PostgreSQL authentication only**
- Admin username: `pgadmin` · set a strong password (save it)
- **Networking** tab:
  - Connectivity: **Public access (selected networks)**
  - ✅ **Allow public access from any Azure service within Azure to this server**
  - ➕ **Add current client IP address** (so you can push the schema from your laptop)
- Review + create.
- After creation: **Databases → Add** → create database `togo_insight`.

### 3. Storage account
**Create a resource → Storage account.**
- Same resource group/region, name e.g. `togoinsightstg123` (lowercase, unique)
- Performance Standard, Redundancy LRS is fine
- Create → open it → **Containers → +Container** → name **`prodtogodata`** (private)
- **Security + networking → Access keys → Show connection string** → copy it (for `AZURE_STORAGE_CONNECTION_STRING`).

### 4. Web App (App Service)
**Create a resource → Web App.**
- Resource group: `togo-insight-rg`
- Name: `togo-insight-web` (becomes `https://togo-insight-web.azurewebsites.net`)
- Publish: **Code**
- Runtime stack: **Node 22 LTS** (pick 22, not 24)
- OS: **Linux**
- Region + App Service Plan: **B1** (Basic) to start
- Create.

---

## 5. Configure App Settings (env vars)

App Service → your Web App → **Settings → Environment variables → App settings**.
Add each of these (Name = Value), then **Apply** (the app restarts):

| Name | Value |
| --- | --- |
| `NEXTAUTH_URL` | `https://togo-insight-web.azurewebsites.net` |
| `NEXTAUTH_SECRET` | a long random string — `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `DATABASE_URL` | `postgresql://pgadmin:<password>@togo-insight-pg.postgres.database.azure.com:5432/togo_insight?sslmode=require` |
| `AZURE_STORAGE_CONNECTION_STRING` | (from the storage account) |
| `AZURE_STORAGE_CONTAINER` | `prodtogodata` |
| `AZURE_AD_CLIENT_ID` | (Entra app — optional, enables Microsoft login) |
| `AZURE_AD_CLIENT_SECRET` | (Entra app) |
| `AZURE_AD_TENANT_ID` | (Entra app) |
| `POWERBI_TENANT_ID` | (service principal — optional, enables dashboards) |
| `POWERBI_CLIENT_ID` | (service principal) |
| `POWERBI_CLIENT_SECRET` | (service principal) |
| `POWERBI_WORKSPACE_ID` | (Power BI workspace) |
| `POWERBI_REPORT_ID` | (Power BI report) |
| `POWERBI_DATASET_ID` | (optional) |

Notes:
- **URL‑encode** any special characters in the DB password (`@` → `%40`, etc.).
- If you omit the `AZURE_AD_*` / `POWERBI_*` groups, those features degrade
  gracefully (Microsoft button shows a hint; Dashboards shows a "Connect Power BI"
  placeholder). The core app still runs.
- Without `DATABASE_URL` the app would fall back to a local JSON store — **always
  set `DATABASE_URL` in production.**

CLI equivalent:

```bash
az webapp config appsettings set -g $RG -n $APP --settings \
  NEXTAUTH_URL="https://$APP.azurewebsites.net" \
  NEXTAUTH_SECRET="<random>" \
  DATABASE_URL="postgresql://pgadmin:<pwd>@$PG.postgres.database.azure.com:5432/$DB?sslmode=require" \
  AZURE_STORAGE_CONNECTION_STRING="<storage-conn-string>" \
  AZURE_STORAGE_CONTAINER="prodtogodata"
```

---

## 6. Create the database tables

The build runs `prisma generate` but **does not** create tables. Run the schema
push **once** against the production database (from your laptop, with your IP
allowed in the PG firewall):

```bash
# from the project folder
DATABASE_URL="postgresql://pgadmin:<pwd>@togo-insight-pg.postgres.database.azure.com:5432/togo_insight?sslmode=require" \
  npx prisma db push
```

(Windows PowerShell:)
```powershell
$env:DATABASE_URL="postgresql://pgadmin:<pwd>@togo-insight-pg.postgres.database.azure.com:5432/togo_insight?sslmode=require"
npx prisma db push
```

> Prefer versioned migrations for prod? Use `npx prisma migrate deploy` instead
> (ask me to add a migration + script). `db push` is fine to get started.

---

## 7. Deploy the code

Pick one:

- **`az webapp up`** (used in Option A) — re-run it from the project folder to redeploy.
- **VS Code** → Azure App Service extension → right‑click the app → **Deploy to Web App**.
- **GitHub Actions** → in the Portal, Web App → **Deployment Center → GitHub**, pick
  your repo/branch; Azure generates a workflow that runs `npm install` + `npm run build`.
- **Zip deploy:**
  ```bash
  az webapp deploy -g $RG -n $APP --src-path ./ --type zip
  ```

Azure's **Oryx** builder auto-runs `npm install` (which runs `prisma generate` via
`postinstall`) and `npm run build`. The startup command `npm run start` launches
`next start` on the port Azure provides.

---

## 8. Wire up Entra ID & Power BI (optional features)

After the app has its real URL, finish these from the main [README.md](README.md):
- **Entra ID app** → add redirect URI:
  `https://togo-insight-web.azurewebsites.net/api/auth/callback/azure-ad`
- **Power BI** → add the service principal to the workspace and enable service
  principals in the Power BI admin portal.

---

## 9. Post‑deploy checklist

- [ ] Open `https://<app>.azurewebsites.net` → landing page loads
- [ ] Sign up / log in works (writes a row to PostgreSQL)
- [ ] Upload a CSV → appears in the **Files** list, output becomes **Ready**
- [ ] Blob shows up in Storage container `prodtogodata/INPUT/`
- [ ] (If configured) Microsoft login + Power BI dashboard load

### Troubleshooting
- **App logs:** Web App → **Monitoring → Log stream**, or
  `az webapp log tail -g $RG -n $APP`.
- **DB connection errors:** confirm `?sslmode=require`, the password is URL‑encoded,
  the PG firewall has "Allow Azure services" on, and the DB name matches.
- **App won't start:** verify startup command is `npm run start` and runtime is Node 22 LTS.
- **500 on login:** ensure `NEXTAUTH_URL` exactly matches the site URL and
  `NEXTAUTH_SECRET` is set.

---

## Rough monthly cost (starter)
- App Service **B1**: ~\$13
- PostgreSQL Flexible **B1ms** + 32 GB: ~\$13–15
- Storage (LRS, small): a few cents

Scale the App Service plan and PG tier up later as traffic grows.
