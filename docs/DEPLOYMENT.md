# EduGenius Backend — Complete Deployment Manual
## Version 2.0.0 | Node.js + Express + MongoDB + PostgreSQL + Redis + OpenAI

---

## Table of Contents
1. [System Requirements](#1-system-requirements)
2. [File Structure](#2-file-structure)
3. [Environment Setup](#3-environment-setup)
4. [Local Development (Docker)](#4-local-development-docker)
5. [Local Development (Manual)](#5-local-development-manual)
6. [Database Setup](#6-database-setup)
7. [Seeding the Database](#7-seeding-the-database)
8. [Production Deployment — Ubuntu VPS](#8-production-deployment--ubuntu-vps)
9. [Production Deployment — Railway / Render](#9-production-deployment--railway--render)
10. [Production Deployment — AWS ECS](#10-production-deployment--aws-ecs)
11. [Nginx Reverse Proxy](#11-nginx-reverse-proxy)
12. [SSL Certificate (Let's Encrypt)](#12-ssl-certificate-lets-encrypt)
13. [API Reference](#13-api-reference)
14. [Troubleshooting](#14-troubleshooting)
15. [Security Checklist](#15-security-checklist)

---

## 1. System Requirements

| Requirement | Minimum | Recommended |
|---|---|---|
| Node.js | 18.x LTS | 20.x LTS |
| RAM | 512 MB | 2 GB |
| Storage | 5 GB | 20 GB |
| OS | Ubuntu 20.04 | Ubuntu 22.04 |
| MongoDB | Atlas M0 (free) | Atlas M10+ |
| PostgreSQL | 14+ | 16+ |
| Redis | 6+ | 7+ |

---

## 2. File Structure

```
edugenius-backend/
├── src/
│   ├── server.js              ← Entry point
│   ├── config/
│   │   ├── mongo.js           ← MongoDB connection
│   │   ├── postgres.js        ← PostgreSQL + Sequelize
│   │   └── redis.js           ← Redis client + cache helpers
│   ├── controllers/
│   │   ├── authController.js  ← Register, login, tokens
│   │   ├── examController.js  ← Sessions, grading, leaderboard
│   │   ├── aiController.js    ← Chat, question gen, study plan
│   │   ├── questionController.js ← CRUD + bulk upload
│   │   ├── analyticsController.js ← Dashboard, school stats
│   │   └── index.js           ← User, goal, assignment, library, admin
│   ├── middleware/
│   │   ├── auth.js            ← JWT verify + role guards
│   │   ├── errorHandler.js    ← Global error handler + AppError
│   │   └── validate.js        ← Joi input validation
│   ├── models/
│   │   ├── mongo/
│   │   │   ├── Question.js    ← Question bank (MongoDB)
│   │   │   └── index.js       ← ChatLog, LibraryResource, Notification
│   │   └── postgres/
│   │       ├── User.js        ← Users (PostgreSQL)
│   │       ├── ExamSession.js ← Exam results
│   │       └── index.js       ← StudyGoal, Assignment, School, Class
│   ├── routes/
│   │   ├── auth.js
│   │   ├── exams.js
│   │   ├── questions.js
│   │   ├── ai.js
│   │   ├── users.js
│   │   ├── goals.js
│   │   ├── assignments.js
│   │   ├── analytics.js
│   │   ├── library.js
│   │   ├── admin.js
│   │   └── notifications.js
│   ├── services/
│   │   ├── examService.js     ← XP calculation, weak topic detection
│   │   └── emailService.js    ← Nodemailer email templates
│   └── utils/
│       └── logger.js          ← Winston logger
├── scripts/
│   └── seed.js                ← Seed DB with sample data
├── logs/                      ← Auto-created at runtime
├── .env.example               ← Environment template
├── .gitignore
├── Dockerfile
├── docker-compose.yml
└── package.json
```

---

## 3. Environment Setup

### Step 1 — Copy the environment template
```bash
cp .env.example .env
```

### Step 2 — Fill in every value in `.env`

```bash
nano .env
```

**Critical values to set:**

| Variable | Where to get it |
|---|---|
| `MONGO_URI` | MongoDB Atlas → Connect → Drivers |
| `PG_HOST / PG_USER / PG_PASSWORD` | Your PostgreSQL server |
| `JWT_SECRET` | Run: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `JWT_REFRESH_SECRET` | Same command (different value) |
| `OPENAI_API_KEY` | https://platform.openai.com/api-keys |
| `SMTP_USER / SMTP_PASS` | Gmail → App Passwords (2FA required) |
| `FRONTEND_URL` | Your deployed frontend URL |

---

## 4. Local Development (Docker) ← Easiest method

This runs the API + PostgreSQL + Redis automatically.  
You still need MongoDB Atlas separately (free tier is fine).

### Prerequisites
- Docker Desktop installed: https://docs.docker.com/get-docker/
- MongoDB Atlas account (free): https://cloud.mongodb.com

### Steps

```bash
# 1. Clone / extract the project
cd edugenius-backend

# 2. Set up environment
cp .env.example .env
# Edit .env — minimum: set MONGO_URI, JWT_SECRET, JWT_REFRESH_SECRET, OPENAI_API_KEY

# 3. Set PostgreSQL to use Docker values
# In .env:
#   PG_HOST=postgres
#   PG_USER=edugenius_user
#   PG_PASSWORD=localdevpassword
#   PG_DATABASE=edugenius
#   PG_SSL=false

# 4. Start all services
docker-compose up -d

# 5. Check logs
docker-compose logs -f api

# 6. Seed the database (first time only)
docker-compose exec api node scripts/seed.js

# 7. Test the API
curl http://localhost:5000/health
```

**Expected response:**
```json
{"status":"ok","service":"EduGenius API","version":"2.0.0"}
```

**Stop services:**
```bash
docker-compose down
```

---

## 5. Local Development (Manual)

### Prerequisites
- Node.js 18+ — https://nodejs.org
- PostgreSQL 14+ running locally
- Redis running locally
- MongoDB Atlas URI

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env with your values (PG_HOST=localhost, PG_SSL=false, REDIS_URL=redis://localhost:6379)

# 3. Start in dev mode (auto-restart on changes)
npm run dev

# 4. Seed the database
npm run seed
```

---

## 6. Database Setup

### MongoDB Atlas (Free Tier)

1. Go to https://cloud.mongodb.com
2. Create a free account
3. Build a **Free** cluster (M0)
4. In **Database Access** → Add a user with Read/Write access
5. In **Network Access** → Add IP `0.0.0.0/0` (or your server IP)
6. Click **Connect** → **Drivers** → Copy the connection string
7. Replace `<password>` and set database name to `edugenius`

Example URI:
```
mongodb+srv://myuser:mypassword@cluster0.abc12.mongodb.net/edugenius?retryWrites=true&w=majority
```

### PostgreSQL (local)

```sql
-- Connect as postgres superuser
psql -U postgres

-- Create database and user
CREATE DATABASE edugenius;
CREATE USER edugenius_user WITH PASSWORD 'your_strong_password';
GRANT ALL PRIVILEGES ON DATABASE edugenius TO edugenius_user;
\q
```

Tables are created **automatically** when the server starts in development mode (`NODE_ENV=development`).

### PostgreSQL (production — use migrations)

For production, set `NODE_ENV=production` and tables will **not** auto-sync.
Run the seed script once on first deploy, which calls `sequelize.sync({ force: false })`.

---

## 7. Seeding the Database

```bash
# Seeds sample questions, admin, teacher, and student accounts
npm run seed
```

**Default test accounts created:**

| Role | Email | Password |
|---|---|---|
| Admin | admin@edugenius.ng | Admin@12345 |
| Teacher | teacher@edugenius.ng | Teacher@12345 |
| Student | student@edugenius.ng | Student@12345 |

> ⚠️ **Change all passwords immediately in production.**

---

## 8. Production Deployment — Ubuntu VPS

Tested on Ubuntu 22.04 (DigitalOcean, AWS EC2, Linode, Hetzner).

### Step 1 — Server setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 (process manager)
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql

# Install Redis
sudo apt install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

### Step 2 — Upload your code

```bash
# Option A: git clone
git clone https://github.com/yourusername/edugenius-backend.git /var/www/edugenius
cd /var/www/edugenius

# Option B: SCP upload
scp -r ./edugenius-backend ubuntu@YOUR_SERVER_IP:/var/www/edugenius
```

### Step 3 — Install dependencies

```bash
cd /var/www/edugenius
npm ci --omit=dev   # production deps only
```

### Step 4 — Configure environment

```bash
cp .env.example .env
nano .env
# Fill all values. Set NODE_ENV=production, PG_SSL=false (same server)
```

### Step 5 — Create PostgreSQL database

```bash
sudo -u postgres psql
```
```sql
CREATE DATABASE edugenius;
CREATE USER edugenius_user WITH PASSWORD 'STRONG_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON DATABASE edugenius TO edugenius_user;
\q
```

### Step 6 — Create logs directory and seed

```bash
mkdir -p logs
NODE_ENV=development node scripts/seed.js
```
(Set `NODE_ENV=development` temporarily so Sequelize creates tables)

### Step 7 — Start with PM2

```bash
# Start the API
pm2 start src/server.js --name edugenius-api --instances 2

# Save PM2 config (survives reboots)
pm2 save
pm2 startup

# Monitor
pm2 status
pm2 logs edugenius-api
```

### Step 8 — Configure Nginx (see Section 11)

---

## 9. Production Deployment — Railway / Render

Both platforms support one-click Node.js deploy with zero server management.

### Railway (https://railway.app)

```bash
# Install Railway CLI
npm install -g @railway/cli
railway login

# In your project directory
railway init
railway up

# Set environment variables via Railway dashboard
# Add PostgreSQL and Redis as Railway plugins
```

In Railway Dashboard:
- **New** → **Add Plugin** → PostgreSQL → copy `DATABASE_URL`
- **New** → **Add Plugin** → Redis → copy `REDIS_URL`
- **Variables** → Add all values from `.env.example`

### Render (https://render.com)

1. Push code to GitHub
2. Render Dashboard → **New Web Service** → Connect GitHub repo
3. Build Command: `npm ci`
4. Start Command: `node src/server.js`
5. Add PostgreSQL and Redis from Render marketplace
6. Set all environment variables in **Environment** tab

---

## 10. Production Deployment — AWS ECS (Advanced)

### Using the included Dockerfile

```bash
# 1. Build image
docker build -t edugenius-api .

# 2. Tag for ECR
aws ecr get-login-password --region eu-west-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT.dkr.ecr.eu-west-1.amazonaws.com
docker tag edugenius-api:latest YOUR_ACCOUNT.dkr.ecr.eu-west-1.amazonaws.com/edugenius-api:latest
docker push YOUR_ACCOUNT.dkr.ecr.eu-west-1.amazonaws.com/edugenius-api:latest

# 3. Create ECS Task Definition pointing to the image
# 4. Set environment variables as ECS Secrets (from AWS Secrets Manager)
# 5. Use RDS for PostgreSQL and ElastiCache for Redis
```

---

## 11. Nginx Reverse Proxy

```bash
sudo nano /etc/nginx/sites-available/edugenius
```

Paste:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    # Security headers
    add_header X-Frame-Options "DENY";
    add_header X-Content-Type-Options "nosniff";
    add_header X-XSS-Protection "1; mode=block";

    location / {
        proxy_pass         http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # SSE support (AI streaming chat)
        proxy_buffering    off;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/edugenius /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 12. SSL Certificate (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
sudo certbot renew --dry-run   # test auto-renew
```

---

## 13. API Reference

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Register new user |
| POST | `/api/auth/login` | — | Login, get tokens |
| POST | `/api/auth/refresh` | — | Refresh access token |
| POST | `/api/auth/logout` | ✅ | Logout (invalidate token) |
| POST | `/api/auth/forgot-password` | — | Send reset email |
| POST | `/api/auth/reset-password/:token` | — | Reset password |
| GET | `/api/auth/me` | ✅ | Get current user |

### Exams

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/exams/questions` | ✅ | Fetch exam questions |
| POST | `/api/exams/start` | ✅ | Start exam session |
| POST | `/api/exams/submit` | ✅ | Submit exam, get graded result |
| GET | `/api/exams/sessions` | ✅ | Get student's exam history |
| GET | `/api/exams/sessions/:id` | ✅ | Get single session with answers |
| GET | `/api/exams/leaderboard` | ✅ | School / global leaderboard |

### AI

| Method | Endpoint | Auth | Rate Limit | Description |
|---|---|---|---|---|
| POST | `/api/ai/chat` | ✅ | 20/hr | Streaming AI tutor chat |
| POST | `/api/ai/generate-questions` | ✅ | 20/hr | Generate custom questions |
| POST | `/api/ai/explain` | ✅ | 20/hr | Explain a question |
| POST | `/api/ai/study-plan` | ✅ | 20/hr | Generate study plan |
| POST | `/api/ai/grade-theory` | ✅ | 20/hr | AI-grade essay answers |

### Questions

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| GET | `/api/questions` | ✅ | Any | List/filter questions |
| GET | `/api/questions/subjects` | ✅ | Any | Available subjects |
| GET | `/api/questions/topics` | ✅ | Any | Topics for a subject |
| GET | `/api/questions/years` | ✅ | Any | Available years |
| GET | `/api/questions/:id` | ✅ | Any | Single question |
| POST | `/api/questions` | ✅ | Teacher+ | Create question |
| PUT | `/api/questions/:id` | ✅ | Teacher+ | Update question |
| DELETE | `/api/questions/:id` | ✅ | Admin | Delete question |
| PATCH | `/api/questions/:id/approve` | ✅ | Admin | Approve question |
| POST | `/api/questions/bulk-upload` | ✅ | Teacher+ | Bulk upload CSV/JSON |

### Analytics

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/analytics/dashboard` | ✅ | Student's own stats |
| GET | `/api/analytics/school` | ✅ Teacher+ | School-level analytics |
| GET | `/api/analytics/student/:id` | ✅ Teacher+ | Individual student view |

### Example: Login Request

```bash
curl -X POST https://api.yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"student@edugenius.ng","password":"Student@12345"}'
```

**Response:**
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR...",
  "user": { "id": "...", "firstName": "Adaeze", "role": "student" }
}
```

### Example: Start Exam

```bash
curl -X GET "https://api.yourdomain.com/api/exams/questions?examType=WAEC&subject=Physics&count=40" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Example: AI Chat (Streaming)

```bash
curl -X POST https://api.yourdomain.com/api/ai/chat \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"Explain Ohm'\''s Law step by step","subject":"Physics"}'
```

---

## 14. Troubleshooting

### "MONGO_URI is not defined"
→ Your `.env` file is missing or not loaded. Check you ran `cp .env.example .env` and filled in the value.

### "Cannot connect to PostgreSQL"
→ Check `PG_HOST`, `PG_USER`, `PG_PASSWORD`, `PG_DATABASE`. For same-server, use `PG_HOST=localhost` and `PG_SSL=false`.

### "Error: listen EADDRINUSE: address already in use :::5000"
→ Port 5000 is busy: `sudo lsof -i :5000` then `kill -9 PID`

### AI chat returns empty / error
→ Check `OPENAI_API_KEY` is valid and you have credits. Test: `curl https://api.openai.com/v1/models -H "Authorization: Bearer $OPENAI_API_KEY"`

### PM2 process keeps crashing
→ Check logs: `pm2 logs edugenius-api --lines 50`. Most likely a missing `.env` value or DB connection failure.

### Bulk question upload fails
→ CSV must have columns: `exam_type, subject, topic, year, type, body, options, answer_index, difficulty, curriculum`. Options separated by `|`.

---

## 15. Security Checklist

Before going live, verify:

- [ ] `.env` is in `.gitignore` — never committed to git
- [ ] `JWT_SECRET` and `JWT_REFRESH_SECRET` are 64-char random strings (not the example values)
- [ ] All test account passwords changed from defaults
- [ ] MongoDB Atlas IP whitelist set to your server IP only (not `0.0.0.0/0`)
- [ ] PostgreSQL not exposed to the public internet (use private networking)
- [ ] Redis password set (`REDIS_PASSWORD`) if Redis is exposed
- [ ] HTTPS enabled (SSL certificate installed)
- [ ] `FRONTEND_URL` set to your actual domain (not `*`)
- [ ] `NODE_ENV=production` in production `.env`
- [ ] `PG_SSL=true` if using a remote PostgreSQL provider
- [ ] Firewall: only ports 80, 443, and 22 open (`sudo ufw allow 80 443 22`)
- [ ] Rate limiting active — default 100 req/15min global, 20/hr for AI endpoints
- [ ] Log files are not publicly accessible

---

*EduGenius Backend v2.0.0 — Built for WAEC, JAMB, UK Curriculum*
*Support: Check GitHub issues or email admin@edugenius.ng*
