# Deploying Nexus ERP to Hostinger VPS

This guide walks you through everything — from buying a server to having your app live on the internet. No technical experience required. Just follow each step in order.

---

## What You'll Need Before Starting

- A **Hostinger account** (hostinger.com)
- Your **mentostore.com** domain on GoDaddy (you'll create a subdomain `admin.mentostore.com`)
- A **GitHub account** with your project pushed to a repository
- A **Gmail account** (for sending invitation emails)
- About **1–2 hours** to complete everything

---

## Step 1: Buy a Hostinger VPS

1. Go to [hostinger.com](https://hostinger.com) and log in
2. Click **VPS Hosting** in the top menu
3. Choose any plan — **KVM 2** (2 vCPU, 8 GB RAM) is recommended for this app
4. During setup, choose:
   - **Operating System:** Ubuntu 22.04
   - **Server location:** closest to your users
5. Complete the purchase
6. Once the server is ready (takes ~5 minutes), go to **hPanel → VPS → Manage**
7. Note down your server's **IP address** (looks like `123.45.67.89`)
8. Note down the **root password** shown in the panel

---

## Step 2: Connect to Your Server

You'll use a terminal/command line to talk to your server.

**On Mac:**
1. Open the **Terminal** app (search for it with Spotlight)
2. Type this (replace with your actual IP):
   ```
   ssh root@123.45.67.89
   ```
3. Type `yes` when asked about fingerprint
4. Enter your root password

**On Windows:**
1. Download and install [PuTTY](https://putty.org)
2. Enter your IP address in the "Host Name" box
3. Click **Open**, then log in as `root` with your password

You're now "inside" your server. Everything you type runs on the server, not your own computer.

---

## Step 3: Install Required Software

Copy and paste each block below into your terminal, one at a time. Press Enter after each one and wait for it to finish.

**Update the server:**
```bash
apt update && apt upgrade -y
```

**Install Docker:**
```bash
curl -fsSL https://get.docker.com | sh
```

**Install Docker Compose:**
```bash
apt install -y docker-compose-plugin
```
> Verify it worked: `docker --version` should print a version number.

**Install Nginx and Certbot (for SSL/HTTPS):**
```bash
apt install -y nginx certbot python3-certbot-nginx
```

**Install Git:**
```bash
apt install -y git
```

---

## Step 4: Create the Subdomain on GoDaddy

You'll use `admin.mentostore.com` as the address for your app.

1. Log in to [GoDaddy](https://godaddy.com) and go to **My Products**
2. Click **DNS** next to `mentostore.com`
3. Click **Add New Record**
4. Fill in:
   - **Type:** A
   - **Name:** `admin`
   - **Value:** your server's IP address (e.g. `123.45.67.89`)
   - **TTL:** 600 (or leave default)
5. Click **Save**

That's it — no `www` record needed for a subdomain.

> DNS changes take 5–30 minutes to work. You can check by visiting [whatsmydns.net](https://www.whatsmydns.net) and searching for `admin.mentostore.com`.

---

## Step 5: Configure Nginx

**Create the Nginx config file:**
```bash
nano /etc/nginx/sites-available/nexus-erp
```

Paste the following exactly as-is (already set to `admin.mentostore.com`):
```nginx
server {
    listen 80;
    server_name admin.mentostore.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name admin.mentostore.com;

    ssl_certificate     /etc/letsencrypt/live/admin.mentostore.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/admin.mentostore.com/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    client_max_body_size 50M;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    location / {
        proxy_pass         http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }
}
```

To save: press `Ctrl+X`, then `Y`, then `Enter`.

**Enable the site:**
```bash
ln -s /etc/nginx/sites-available/nexus-erp /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

---

## Step 6: Get a Free SSL Certificate (HTTPS)

This makes your site secure (`https://`) and shows a padlock in the browser.

> Make sure your domain is already pointing to this server (Step 4) before running this.

```bash
certbot --nginx -d admin.mentostore.com
```

Follow the prompts:
- Enter your email address
- Agree to terms (type `Y`)
- Choose whether to share your email with EFF (optional)

Certbot automatically renews your certificate. You're done with SSL.

---

## Step 7: Clone Your Project onto the Server

```bash
mkdir -p /opt/nexus-erp
cd /opt/nexus-erp
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git .
```

Replace `YOUR_USERNAME` and `YOUR_REPO_NAME` with your GitHub username and repository name.

> If your repository is **private**, you'll need to authenticate. The easiest way is to use a GitHub Personal Access Token:
> 1. Go to GitHub → Settings → Developer Settings → Personal access tokens → Tokens (classic)
> 2. Generate a token with `repo` scope
> 3. Use it in the clone URL: `https://YOUR_TOKEN@github.com/YOUR_USERNAME/YOUR_REPO_NAME.git`

---

## Step 8: Create the Production Environment File

This file holds all your secret configuration. It **never** goes into Git.

```bash
nano /opt/nexus-erp/.env.production
```

Paste this template and fill in your actual values:

```env
# --- Database (Neon.tech) ---
# Copy the "Pooled connection" string from your Neon dashboard
DATABASE_URL=postgresql://username:password@ep-xxxx-pooler.region.aws.neon.tech/neondb?sslmode=require&channel_binding=require

# Same URL but remove "-pooler" from the hostname (used for migrations)
DIRECT_URL=postgresql://username:password@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require&channel_binding=require

# --- Session Security ---
# Generate a random 32+ character string (you can use: openssl rand -hex 32)
SESSION_SECRET=paste-a-long-random-string-here

# --- Your App URL ---
NEXTAUTH_URL=https://admin.mentostore.com

# --- Email (for sending invitations) ---
EMAIL_FROM=noreply@mentostore.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your.gmail@gmail.com
SMTP_PASS=your-16-character-app-password
```

To save: press `Ctrl+X`, then `Y`, then `Enter`.

**To generate a secure SESSION_SECRET:**
```bash
openssl rand -hex 32
```
Copy the output and paste it as the value for `SESSION_SECRET`.

---

## Step 9: Set Up Gmail for Sending Emails

The app sends invitation emails to new workers. Here's how to set up Gmail:

1. Go to your Google account → **Security**
2. Make sure **2-Step Verification** is turned ON (required for App Passwords)
3. Search for **"App passwords"** in Google account settings
4. Click **App passwords**
5. Under "Select app" choose **Mail**, under "Select device" choose **Other** and type "Nexus ERP"
6. Click **Generate** — you'll get a 16-character password like `abcd efgh ijkl mnop`
7. Copy that password (remove the spaces) and paste it as `SMTP_PASS` in your `.env.production`

> If you don't set up email, invitation links will still work — the admin can copy and share them manually from the Users page.

---

## Step 10: Run the First Deploy

Make the deploy script executable and run it:

```bash
chmod +x /opt/nexus-erp/deploy.sh
bash /opt/nexus-erp/deploy.sh
```

This will:
1. Build the Docker image (takes 3–5 minutes the first time)
2. Start the app container
3. Your app will be running at `https://admin.mentostore.com`

**Verify it's working:**
```bash
docker ps
```
You should see a container named `nexus-erp` with status `Up`.

---

## Step 11: Run the Database Migration

This creates the required tables in your Neon.tech database. Run this once:

```bash
cd /opt/nexus-erp
docker run --rm --env-file .env.production nexus-erp:latest npm run db:migrate
```

> If you see errors about tables already existing, that's fine — it means some tables were already created and Drizzle is skipping them.

---

## Step 12: Set Up Automatic Deploys (GitHub Actions)

Every time you push code to GitHub, your server will automatically update. To set this up, you need to give GitHub a way to connect to your server.

### Create an SSH Key for GitHub

On your server, run:
```bash
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_deploy -N ""
cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys
cat ~/.ssh/github_deploy
```

The last command prints the **private key** — copy everything from `-----BEGIN OPENSSH PRIVATE KEY-----` to `-----END OPENSSH PRIVATE KEY-----` (including those lines).

### Add Secrets to GitHub

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** for each of these:

| Secret Name | Value |
|---|---|
| `VPS_HOST` | Your server's IP address (e.g. `123.45.67.89`) |
| `VPS_USER` | `root` |
| `VPS_SSH_KEY` | The private key you copied above |

### Test It

Push any small change to your GitHub repository's `main` branch. Then:
1. Go to your repository on GitHub
2. Click the **Actions** tab
3. You should see a workflow running called "Deploy to VPS"
4. It will turn green when done — your server has been updated automatically

---

## Default Login Credentials

After the first deploy, log in with:

- **Email:** `admin@nexus.local`
- **Password:** `admin`

**Change the password immediately** after logging in — go to Settings → My Profile.

---

## Troubleshooting

### App isn't loading / getting an error
```bash
docker logs nexus-erp
```
This shows what's going wrong inside the container.

### Nginx error
```bash
nginx -t
journalctl -u nginx --no-pager -n 50
```

### Rebuild and restart manually
```bash
cd /opt/nexus-erp
bash deploy.sh
```

### Check if the container is running
```bash
docker ps
```

### Restart just the container (without rebuilding)
```bash
docker-compose -f /opt/nexus-erp/docker-compose.yml restart
```

### Free up disk space
```bash
docker system prune -f
```

---

## Renewing SSL Certificate

Certbot renews automatically. If you ever need to do it manually:
```bash
certbot renew
systemctl reload nginx
```

---

## Summary Checklist

- [ ] Bought Hostinger VPS (Ubuntu 22.04)
- [ ] Connected via SSH
- [ ] Installed Docker, Nginx, Certbot, Git
- [ ] Created `admin` subdomain A record on GoDaddy pointing to server IP
- [ ] Configured and enabled Nginx site
- [ ] Got SSL certificate with Certbot
- [ ] Cloned project to `/opt/nexus-erp`
- [ ] Created `.env.production` with all values filled in
- [ ] Set up Gmail App Password for email invitations
- [ ] Ran `deploy.sh` for first deploy
- [ ] Ran database migration
- [ ] Added GitHub Actions secrets (`VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`)
- [ ] Tested automatic deploy by pushing to `main`
- [ ] Logged in and changed the default admin password
