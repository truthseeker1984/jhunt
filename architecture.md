# Architecture Document: J(ob)Hunt

**Wersja:** 1.0  
**Data:** 22 listopada 2025  
**Bazuje na:** PRD v3.0

---

## 1. System Overview

### High-Level Architecture

```ascii
┌──────────────────────────────────────────────────────────────────┐
│                         UŻYTKOWNIK                                │
│                        (Przeglądarka)                             │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      CLOUDFLARE                                  │
│  • DNS Resolution                                                │
│  • WAF (Geo-blocking, Bot Protection)                           │
│  • Cache Layer (Cache Everything + Purge on Deploy)             │
│  • Rate Limiting                                                 │
│  • DDoS Protection                                               │
└─────────────┬──────────┬─────────────────┬──────────────────────┘
              │          │                 │
      (static assets) (Logos)        (API requests)
              │          │                 │
              ▼          ▼                 ▼
┌──────────────────┐ ┌────────┐    ┌──────────────────────────────────┐
│     VERCEL       │ │  R2    │    │       MIKRUS VPS                 │
│ • Next.js FE     │ │Storage │    │  ┌────────────────────────────┐ │
│ • SSR/SSG        │ │(Images)│    │  │         NGINX              │ │
│ • Auto-deploy    │ │        │    │  │  (Reverse Proxy + SSL)     │ │
│ • Edge Functions │ └────────┘    │  └──────────┬─────────────────┘ │
└──────────────────┘               │             ▼                    │
                                   │  ┌────────────────────────────┐ │
                                   │  │      UVICORN (ASGI)        │ │
                                   │  └──────────┬─────────────────┘ │
                                   │             ▼                    │
                                   │  ┌────────────────────────────┐ │
                                   │  │     FASTAPI Backend        │ │
                                   │  │  • REST API (JWT Auth)     │ │
                                   │  │  • Business Logic          │ │
                                   │  │  • SQLAlchemy ORM          │ │
                                   │  │  • S3 Client (boto3)       │ │
                                   │  └──────┬──────────┬──────────┘ │
                                   │         │          │             │
                                   │         ▼          ▼             │
                                   │  ┌──────────┐  ┌──────────────┐ │
                                   │  │PostgreSQL│  │APScheduler   │ │
                                   │  │  (Data)  │  │(Background)  │ │
                                   │  └──────────┘  └──────────────┘ │
                                   └──────────────────────────────────┘


                    ┌──────────────────────────┐
                    │   GITHUB + ACTIONS       │
                    │  • Source Control        │
                    │  • CI/CD Pipeline        │
                    │  • Deploy Automation     │
                    │  • Cache Invalidation    │
                    └──────────────────────────┘
```

---

## 2. Repository Structure

### Strategia: Mono-repo

Cały projekt w jednym repozytorium dla uproszczenia workflow i współdzielenia typów/schematów.

```
jhunt/
├── backend/                    # FastAPI Backend
│   ├── alembic/               # Migracje bazy danych
│   │   ├── versions/
│   │   └── env.py
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py            # Entry point FastAPI
│   │   ├── config.py          # Konfiguracja (env vars, feature flags)
│   │   ├── database.py        # SQLAlchemy setup
│   │   ├── dependencies.py    # FastAPI dependencies (auth, db session)
│   │   ├── models/            # SQLAlchemy Models (ORM)
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── job.py
│   │   │   ├── job_source.py
│   │   │   ├── keyword.py
│   │   │   ├── application.py
│   │   │   └── blacklist.py
│   │   ├── schemas/           # Pydantic Schemas (API validation)
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── job.py
│   │   │   ├── auth.py
│   │   │   └── ...
│   │   ├── api/               # API Routes
│   │   │   ├── __init__.py
│   │   │   ├── v1/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── auth.py        # /api/v1/auth/*
│   │   │   │   ├── users.py       # /api/v1/users/*
│   │   │   │   ├── jobs.py        # /api/v1/jobs/*
│   │   │   │   ├── keywords.py    # /api/v1/keywords/*
│   │   │   │   ├── applications.py# /api/v1/applications/*
│   │   │   │   ├── blacklist.py   # /api/v1/blacklist/*
│   │   │   │   └── admin.py       # /api/v1/admin/* (job sources CRUD)
│   │   ├── services/          # Business Logic
│   │   │   ├── __init__.py
│   │   │   ├── auth_service.py
│   │   │   ├── user_service.py
│   │   │   ├── job_service.py
│   │   │   ├── scraper_service.py
│   │   │   └── matching_service.py
│   │   ├── scrapers/          # Scraping Modules
│   │   │   ├── __init__.py
│   │   │   ├── base_scraper.py    # Abstract base class
│   │   │   ├── nofluffjobs.py
│   │   │   ├── solidjobs.py
│   │   │   └── justjoinit.py
│   │   ├── scheduler/         # APScheduler Setup
│   │   │   ├── __init__.py
│   │   │   └── jobs.py            # Scheduled tasks
│   │   └── utils/
│   │       ├── __init__.py
│   │       ├── security.py        # Password hashing, JWT
│   │       └── validators.py
│   ├── tests/
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
│
├── frontend/                   # Next.js Frontend
│   ├── public/
│   │   ├── images/
│   │   └── favicon.ico
│   ├── src/
│   │   ├── app/               # Next.js 14+ App Router
│   │   │   ├── layout.tsx         # Root layout
│   │   │   ├── page.tsx           # Landing page (/)
│   │   │   ├── login/
│   │   │   │   └── page.tsx       # Login page
│   │   │   ├── register/
│   │   │   │   └── page.tsx       # Registration page
│   │   │   ├── dashboard/         # Jobseeker dashboard
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx       # Job listings
│   │   │   │   ├── profile/
│   │   │   │   │   └── page.tsx   # Profile settings
│   │   │   │   └── keywords/
│   │   │   │       └── page.tsx   # Keywords CRUD
│   │   │   └── admin/             # Admin panel
│   │   │       ├── layout.tsx
│   │   │       └── sources/
│   │   │           └── page.tsx   # Job sources CRUD
│   │   ├── components/        # Reusable Components
│   │   │   ├── ui/                # Base UI components
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Table.tsx
│   │   │   │   └── Modal.tsx
│   │   │   ├── layout/
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── Footer.tsx
│   │   │   │   └── Sidebar.tsx
│   │   │   ├── JobCard.tsx
│   │   │   ├── JobTable.tsx       # Drag-and-drop table
│   │   │   └── ThemeToggle.tsx
│   │   ├── lib/               # Utilities
│   │   │   ├── api.ts             # Axios client
│   │   │   ├── auth.ts            # Auth helpers
│   │   │   └── storage.ts         # LocalStorage/Cookies
│   │   ├── hooks/             # Custom React Hooks
│   │   │   ├── useAuth.ts
│   │   │   ├── useJobs.ts
│   │   │   └── useTheme.ts
│   │   ├── contexts/          # React Context
│   │   │   ├── AuthContext.tsx
│   │   │   └── ThemeContext.tsx
│   │   ├── styles/
│   │   │   └── globals.css
│   │   └── types/             # TypeScript types
│   │       ├── api.ts
│   │       └── models.ts
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   └── .env.local.example
│
├── .github/
│   └── workflows/
│       ├── deploy-frontend.yml    # CI/CD dla Vercel
│       └── deploy-backend.yml     # CI/CD dla Mikrus
│
├── docs/                       # Dokumentacja
│   └── api/
│       └── endpoints.md
│
├── .gitignore
├── .specstory/                 # Lokalnie (w .gitignore)
├── prd.md
├── architecture.md             # Ten plik
└── README.md
```

---

## 3. Database Schema

### Diagram ERD (Entity-Relationship)

```
┌──────────────────┐          ┌──────────────────┐
│      Users       │          │   JobSources     │
├──────────────────┤          ├──────────────────┤
│ id (PK)          │          │ id (PK)          │
│ email (unique)   │          │ name             │
│ hashed_password  │          │ url              │
│ is_active        │          │ scraper_type     │
│ active_role      │          │ is_active        │
│ theme_preference │          │ created_at       │
│ language         │          │ updated_at       │
│ created_at       │          └──────────────────┘
│ updated_at       │                   │
└────────┬─────────┘                   │
         │                             ▼
         │                   ┌──────────────────┐
         │                   │    JobGroups     │◄─── Grupowanie duplikatów
         │                   ├──────────────────┤
         │                   │ id (PK)          │
         │                   │ normalized_title │
         │                   │ company          │
         │                   │ location         │
         │                   │ logo_url         │
         │                   │ created_at       │
         │                   └────────┬─────────┘
         │                            │
         ▼                            ▼
┌──────────────────┐        ┌──────────────────┐
│    UserRoles     │        │       Jobs       │◄─── Partycjonowane
├──────────────────┤        ├──────────────────┤
│ id (PK)          │        │ id (PK)          │
│ user_id (FK)     │        │ group_id (FK)    │◄─── Łączy duplikaty
│ role_name        │        │ source_id (FK)   │
│ created_at       │        │ external_id      │
└──────────────────┘        │ title            │
                            │ company          │
                            │ location         │
                            │ salary_min       │
                            │ salary_max       │
                            │ url              │
                            │ is_active        │
                            │ first_seen_at    │
                            │ last_seen_at     │
                            │ last_updated_at  │◄─── Tracking zmian
                            │ closed_at        │
                            │ repost_count     │◄─── Ile razy wróciła
                            │ created_at       │
                            └────────┬─────────┘
         │                            │
         │                            ▼
         │                   ┌──────────────────┐
         │                   │   JobHistory     │◄─── Historia zmian
         │                   ├──────────────────┤
         │                   │ id (PK)          │
         │                   │ job_id (FK)      │
         │                   │ source_id        │
         │                   │ field_name       │
         │                   │ old_value        │
         │                   │ new_value        │
         │                   │ changed_at       │
         │                   └──────────────────┘
         │
         ├────────────────────────────┤
         │                            │
         ▼                            ▼
┌──────────────────┐        ┌──────────────────┐
│    Keywords      │        │  UserJobStatus   │
├──────────────────┤        ├──────────────────┤
│ id (PK)          │        │ id (PK)          │
│ user_id (FK)     │        │ user_id (FK)     │
│ keyword          │        │ group_id (FK)    │◄─── Śledzi grupę, nie job
│ is_active        │        │ status           │
│ created_at       │        │ display_order    │◄─── Drag-and-drop
└──────────────────┘        │ notes            │
         │                  │ selected_job_id  │◄─── Wybrany link (portal)
         │                  │ applied_at       │
         │                  │ seen_as_new      │◄─── Czy widział jako nową
         │                  │ created_at       │
         │                  │ updated_at       │
         │                  └──────────────────┘
         │
         ▼
┌──────────────────┐
│  CompanyBlacklist│
├──────────────────┤
│ id (PK)          │
│ user_id (FK)     │
│ company_name     │
│ created_at       │
└──────────────────┘
```

### Tabele - Szczegóły

#### 1. `users`

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    active_role VARCHAR(50) DEFAULT 'JobSeeker',  -- 'JobSeeker', 'JobAdvertiser'
    theme_preference VARCHAR(10) DEFAULT 'dark',  -- 'dark', 'light'
    language VARCHAR(5) DEFAULT 'pl',             -- 'pl', 'en'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_users_email ON users(email);
```

#### 2. `user_roles`

```sql
CREATE TABLE user_roles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role_name VARCHAR(50) NOT NULL,  -- 'JobSeeker', 'JobAdvertiser'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, role_name)
);
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
```

#### 3. `job_sources`

```sql
CREATE TABLE job_sources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    url VARCHAR(500) NOT NULL,
    scraper_type VARCHAR(50) NOT NULL,  -- 'nofluffjobs', 'solidjobs', 'justjoinit'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 3. `job_groups` (Grupowanie Duplikatów)

```sql
CREATE TABLE job_groups (
    id BIGSERIAL PRIMARY KEY,
    normalized_title VARCHAR(500) NOT NULL,  -- Znormalizowany tytuł (lowercase, bez znaków)
    company VARCHAR(255) NOT NULL,           -- Nazwa firmy
    location VARCHAR(255),                   -- Lokalizacja
    logo_url VARCHAR(1000),                  -- URL do Cloudflare R2 (logo firmy)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(normalized_title, company, location)  -- Unikalna kombinacja
);
CREATE INDEX idx_job_groups_lookup ON job_groups(normalized_title, company);
```

**Cel:** Grupuje oferty z różnych portali, które są tym samym ogłoszeniem.

**Przykład:**

```
group_id=1: "Senior Python Developer" + "Google" + "Warszawa"
  ├─ job_id=10 (NoFluffJobs)
  ├─ job_id=23 (JustJoinIT)
  └─ job_id=45 (SolidJobs)
```

#### 4. `jobs` (Partycjonowane)

```sql
CREATE TABLE jobs (
    id BIGSERIAL,
    group_id BIGINT REFERENCES job_groups(id) ON DELETE SET NULL,  -- Grupowanie duplikatów
    source_id INTEGER NOT NULL REFERENCES job_sources(id),
    external_id VARCHAR(255) NOT NULL,  -- ID z zewnętrznego portalu

    -- Dane oferty
    title VARCHAR(500) NOT NULL,
    company VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    salary_min INTEGER,
    salary_max INTEGER,
    url VARCHAR(1000) NOT NULL,

    -- Statusy i daty
    is_active BOOLEAN DEFAULT TRUE,
    first_seen_at TIMESTAMP NOT NULL,       -- Kiedy PO RAZ PIERWSZY znaleziono
    last_seen_at TIMESTAMP NOT NULL,        -- Ostatnia weryfikacja (update przy scrapingu)
    last_updated_at TIMESTAMP,              -- Kiedy dane się zmieniły (salary, title, etc.)
    closed_at TIMESTAMP,                    -- Kiedy oferta zniknęła z portalu
    repost_count INTEGER DEFAULT 0,         -- Ile razy oferta wróciła po zamknięciu

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id, source_id),
    UNIQUE(source_id, external_id)  -- Unikalna kombinacja source + external_id
) PARTITION BY LIST (source_id);

-- Partycje (fizyczne tabele)
CREATE TABLE jobs_source_1 PARTITION OF jobs FOR VALUES IN (1);  -- NoFluffJobs
CREATE TABLE jobs_source_2 PARTITION OF jobs FOR VALUES IN (2);  -- SolidJobs
CREATE TABLE jobs_source_3 PARTITION OF jobs FOR VALUES IN (3);  -- JustJoinIT

-- Indeksy (automatycznie propagowane na partycje)
CREATE INDEX idx_jobs_active ON jobs(is_active) WHERE is_active = true;
CREATE INDEX idx_jobs_group ON jobs(group_id);
CREATE INDEX idx_jobs_company ON jobs(company);
CREATE INDEX idx_jobs_first_seen ON jobs(first_seen_at);  -- Ghosting detection
CREATE INDEX idx_jobs_title_gin ON jobs USING gin(to_tsvector('english', title));
```

**Kolumna `repost_count`:**

- Zlicza ile razy oferta była closed → active
- Jeśli > 0 → pokazujemy użytkownikowi badge "Re-posted" (potencjalny ghosting)

#### 5. `job_history` (Historia Zmian - Partycjonowane)

```sql
CREATE TABLE job_history (
    id BIGSERIAL,
    job_id BIGINT NOT NULL,
    source_id INTEGER NOT NULL,

    -- Szczegóły zmiany
    field_name VARCHAR(50) NOT NULL,  -- 'salary_min', 'salary_max', 'title', 'location', 'url'
    old_value TEXT,
    new_value TEXT,

    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id, source_id),
    FOREIGN KEY (job_id, source_id) REFERENCES jobs(id, source_id) ON DELETE CASCADE
) PARTITION BY LIST (source_id);

CREATE TABLE job_history_source_1 PARTITION OF job_history FOR VALUES IN (1);
CREATE TABLE job_history_source_2 PARTITION OF job_history FOR VALUES IN (2);
CREATE TABLE job_history_source_3 PARTITION OF job_history FOR VALUES IN (3);

CREATE INDEX idx_job_history_job ON job_history(job_id, source_id);
CREATE INDEX idx_job_history_date ON job_history(changed_at);
```

**Przykład wpisu:**

```
| job_id | field_name  | old_value | new_value | changed_at  |
|--------|-------------|-----------|-----------|-------------|
| 123    | salary_max  | 15000     | 18000     | 2025-11-15  |
| 123    | location    | Warszawa  | Remote    | 2025-11-20  |
```

#### 6. `keywords`

```sql
CREATE TABLE keywords (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    keyword VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_keywords_user ON keywords(user_id);
```

#### 7. `user_job_status` (Śledzenie Ofert Użytkownika)

```sql
CREATE TABLE user_job_status (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    group_id BIGINT REFERENCES job_groups(id) ON DELETE CASCADE,  -- Śledzi GRUPĘ (nie pojedynczy job)

    -- Status procesu rekrutacji
    status VARCHAR(50) DEFAULT 'interested',  -- 'interested', 'applied', 'interview', 'rejected', 'accepted'

    -- Wybór portalu
    selected_job_id BIGINT,  -- Który konkretny job wybrał (z której grupy = z jakiego portalu)

    -- Kolejność i notatki
    display_order INTEGER DEFAULT 0,  -- Drag-and-drop (MVP: Integer, Scale: Lexorank)
    notes TEXT,

    -- Tracking
    applied_at TIMESTAMP,
    seen_as_new BOOLEAN DEFAULT TRUE,  -- Czy użytkownik widział jako nową ofertę (dla re-posts)

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, group_id)  -- Użytkownik może śledzić grupę tylko raz
);
CREATE INDEX idx_user_job_status_user ON user_job_status(user_id);
CREATE INDEX idx_user_job_status_order ON user_job_status(user_id, display_order);
CREATE INDEX idx_user_job_status_group ON user_job_status(group_id);
```

**⚠️ WAŻNE - Walidacja Aplikacji:**
`selected_job_id` (konkretny portal) musi należeć do `group_id` (grupa ofert). Baza danych nie wymusi tego relacją foreign key wprost (złożoność), więc **Service Layer musi to walidować** przed zapisem.

**Kolumna `seen_as_new`:**

- Używana do oznaczania ofert, które wróciły (re-post)
- Gdy oferta wraca po closed → `seen_as_new = TRUE` (pokazujemy jako nową z badge "Re-posted")
- Użytkownik klika → `seen_as_new = FALSE`

**Kolumna `selected_job_id`:**

- Użytkownik wybiera z której wersji oferty (portal) chce aplikować
- Przechowuje ID konkretnego job z grupy

#### 8. `company_blacklist`

```sql
CREATE TABLE company_blacklist (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, company_name)
);
CREATE INDEX idx_blacklist_user ON company_blacklist(user_id);
```

---

## 4. Backend Architecture (FastAPI)

### API Endpoints Overview

#### Public Endpoints

```
POST   /api/v1/auth/register          # Rejestracja (jeśli feature flag włączony)
POST   /api/v1/auth/login             # Logowanie (zwraca JWT)
POST   /api/v1/auth/refresh           # Odświeżanie tokenu
```

#### Protected Endpoints (User)

```
GET    /api/v1/users/me               # Profil użytkownika (z aktywną rolą)
PATCH  /api/v1/users/me               # Aktualizacja profilu (theme, language)
POST   /api/v1/users/switch-role      # Przełączenie kontekstu roli (active_role)

# === Context: JobSeeker ===
GET    /api/v1/keywords               # Lista słów kluczowych
POST   /api/v1/keywords               # Dodaj słowo kluczowe
DELETE /api/v1/keywords/{id}          # Usuń słowo kluczowe

GET    /api/v1/jobs                   # Lista dopasowanych grup ofert (z deduplikacją)
GET    /api/v1/jobs/group/{group_id}  # Szczegóły grupy (wszystkie portale)
GET    /api/v1/jobs/{job_id}          # Szczegóły pojedynczej oferty
GET    /api/v1/jobs/{job_id}/history  # Historia zmian oferty

GET    /api/v1/applications           # Lista śledzonych aplikacji
POST   /api/v1/applications           # Oznacz grupę jako śledzoną
PATCH  /api/v1/applications/{id}      # Aktualizuj status/kolejność/notatki/selected_job
DELETE /api/v1/applications/{id}      # Usuń z śledzenia

GET    /api/v1/blacklist              # Lista firm na blackliście
POST   /api/v1/blacklist              # Dodaj firmę
DELETE /api/v1/blacklist/{id}         # Usuń firmę

GET    /api/v1/export                 # Eksport danych użytkownika (JSON/CSV)
POST   /api/v1/import                 # Import aplikacji z Excel
```

#### Admin Endpoints

```
GET    /api/v1/admin/sources          # Lista źródeł do scrapowania
POST   /api/v1/admin/sources          # Dodaj źródło
PATCH  /api/v1/admin/sources/{id}     # Edytuj źródło
DELETE /api/v1/admin/sources/{id}     # Usuń źródło

POST   /api/v1/admin/scraper/trigger  # Ręczne uruchomienie scrapera
```

### Authentication Flow

```
┌─────────────┐                    ┌──────────────┐
│   Client    │                    │   Backend    │
│ (Frontend)  │                    │   (FastAPI)  │
└──────┬──────┘                    └──────┬───────┘
       │                                  │
       │  POST /api/v1/auth/register     │
       │  { email, password }             │
       ├─────────────────────────────────►│
       │                                  │ Check ALLOW_REGISTRATION
       │                                  │ (Feature Flag)
       │                                  │ Hash password
       │                                  │ Create user
       │                                  │
       │  201 Created                     │
       │◄─────────────────────────────────┤
       │                                  │
       │  POST /api/v1/auth/login         │
       │  { email, password }             │
       ├─────────────────────────────────►│
       │                                  │ Verify credentials
       │                                  │ Generate JWT (access + refresh)
       │                                  │
       │  { access_token, refresh_token } │
       │◄─────────────────────────────────┤
       │                                  │
       │  Set-Cookie: access_token=...    │
       │  Set-Cookie: refresh_token=...   │
       │  (HttpOnly, Secure, SameSite)    │
       │                                  │
       │  GET /api/v1/jobs                │
       │  Cookie: access_token=...        │
       ├─────────────────────────────────►│
       │                                  │ Validate JWT
       │                                  │ Extract user_id
       │                                  │ Query DB
       │                                  │
       │  [{ job1 }, { job2 }, ...]       │
       │◄─────────────────────────────────┤
       │                                  │
```

### 4.4. Email Infrastructure (Resend)

**Wybrany dostawca:** **Resend**

**Dlaczego Resend?**

1.  **Developer Experience:** Biblioteka Python SDK jest minimalistyczna i nowoczesna.
2.  **Free Tier:** 3,000 maili miesięcznie za darmo (vs 100/dzień w SendGrid).
3.  **React Email:** Możliwość kodowania szablonów maili w React (spójność z frontendem Next.js).
4.  **Dostarczalność:** Nowe, czyste adresy IP zapewniające, że maile nie trafiają do SPAM.

**Integracja:**

- Backend używa API Resend (przez SDK lub SMTP).
- Klucze API przechowywane w `.env`.
- Wysyłka asynchroniczna (Background Tasks).

### 4.5. Feature Flags (Bezpieczeństwo)

**Problem:** Registration musi być wyłączalny po dodaniu pierwszego użytkownika.

**Rozwiązanie:** Environment Variable + Backend Validation

```python
# backend/app/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str

    # Security
    SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Feature Flags
    ALLOW_REGISTRATION: bool = True  # Set to False in production .env

    class Config:
        env_file = ".env"

settings = Settings()
```

```python
# backend/app/api/v1/auth.py
from fastapi import APIRouter, HTTPException, Depends
from app.config import settings

@router.post("/register")
async def register(user_data: UserCreate):
    if not settings.ALLOW_REGISTRATION:
        raise HTTPException(
            status_code=403,
            detail="Registration is currently disabled"
        )
    # ... reszta logiki rejestracji
```

**Deployment:**

1. Stwórz użytkownika przez API (feature flag = True).
2. W pliku `.env` na serwerze ustaw `ALLOW_REGISTRATION=false`.
3. Restart backendu.
4. Próba rejestracji = 403 Forbidden.

**Bezpieczeństwo:** Nawet jeśli haker ma dostęp do frontendu, backend odrzuci request. Frontend może ukryć przycisk (UX), ale backend jest strażnikiem.

### Scraper Logic: Grupowanie, Duplikaty i Re-posty

#### Algorytm Scrapera (Szczegółowy Flow)

```python
# backend/app/services/scraper_service.py

async def process_scraped_job(self, scraped_data: dict, source_id: int):
    """
    Główna funkcja przetwarzająca zescrapowaną ofertę.
    Obsługuje:
    - Nowe oferty
    - Aktualizacje istniejących
    - Grupowanie duplikatów
    - Re-posty (oferty, które wracają)
    - Historię zmian
    """

    # 1. NORMALIZACJA (do wykrywania duplikatów)
    normalized_title = self._normalize_title(scraped_data['title'])
    company = scraped_data['company'].strip()
    location = scraped_data.get('location', '').strip()

    # 2. ZNAJDŹ/STWÓRZ GRUPĘ (grupowanie duplikatów między portalami)
    job_group = db.query(JobGroup).filter(
        JobGroup.normalized_title == normalized_title,
        JobGroup.company == company,
        JobGroup.location == location
    ).first()

    if not job_group:
        job_group = JobGroup(
            normalized_title=normalized_title,
            company=company,
            location=location
        )
        db.add(job_group)
        db.commit()
        db.refresh(job_group)

    # 3. SPRAWDŹ CZY OFERTA JUŻ ISTNIEJE W TYM ŹRÓDLE
    external_id = scraped_data['external_id']
    existing_job = db.query(Job).filter(
        Job.source_id == source_id,
        Job.external_id == external_id
    ).first()

    if existing_job:
        # === ISTNIEJĄCA OFERTA ===
        await self._update_existing_job(existing_job, scraped_data, job_group.id)
    else:
        # === NOWA OFERTA ===
        await self._create_new_job(scraped_data, source_id, job_group.id)


async def _update_existing_job(self, job: Job, new_data: dict, group_id: int):
    """Aktualizuje istniejącą ofertę"""

    # Wykryj zmiany w danych
    changes = self._detect_changes(job, new_data)

    if changes:
        # Zapisz historię zmian
        for field, (old_val, new_val) in changes.items():
            history_entry = JobHistory(
                job_id=job.id,
                source_id=job.source_id,
                field_name=field,
                old_value=str(old_val),
                new_value=str(new_val),
                changed_at=datetime.now()
            )
            db.add(history_entry)

            # Aktualizuj pole w job
            setattr(job, field, new_val)

        job.last_updated_at = datetime.now()

    # Zawsze aktualizuj last_seen_at (oferta wciąż żyje)
    job.last_seen_at = datetime.now()

    # Jeśli oferta była zamknięta, a teraz wraca → RE-POST!
    if not job.is_active:
        job.is_active = True
        job.closed_at = None
        job.repost_count += 1  # Inkrementuj licznik re-postów

        # Oznacz użytkowników, którzy tę grupę śledzą
        # że mają nową ofertę (re-post)
        await self._mark_repost_for_users(job.group_id)

    # Aktualizuj group_id (może się zmienić jeśli zmienił się tytuł/firma)
    job.group_id = group_id

    db.commit()


async def _create_new_job(self, data: dict, source_id: int, group_id: int):
    """Tworzy nową ofertę"""

    new_job = Job(
        group_id=group_id,
        source_id=source_id,
        external_id=data['external_id'],
        title=data['title'],
        company=data['company'],
        location=data.get('location'),
        salary_min=data.get('salary_min'),
        salary_max=data.get('salary_max'),
        url=data['url'],
        is_active=True,
        first_seen_at=datetime.now(),
        last_seen_at=datetime.now(),
        repost_count=0
    )
    db.add(new_job)
    db.commit()


async def _mark_repost_for_users(self, group_id: int):
    """
    Gdy oferta wraca (re-post), oznacz użytkowników że mają "nową" ofertę.
    Używane do pokazania badge "Re-posted" w UI.
    """
    db.query(UserJobStatus).filter(
        UserJobStatus.group_id == group_id
    ).update({
        'seen_as_new': True,
        'updated_at': datetime.now()
    })
    db.commit()


async def mark_missing_jobs_as_closed(self, source_id: int, found_external_ids: list):
    """
    Po zakończeniu scrapingu, oznacz oferty które nie zostały znalezione jako closed.
    """
    db.query(Job).filter(
        Job.source_id == source_id,
        Job.is_active == True,
        Job.external_id.notin_(found_external_ids)
    ).update({
        'is_active': False,
        'closed_at': datetime.now()
    })
    db.commit()


def _normalize_title(self, title: str) -> str:
    """
    Normalizuje tytuł do wykrywania duplikatów.

    Przykłady:
      "Senior Python Developer" → "senior python developer"
      "Python Dev (Senior)"     → "senior python developer"
      "Sr. Python Developer"    → "senior python developer"
    """
    title = title.lower()

    # Zamień skróty na pełne formy
    replacements = {
        r'\bsr\.?\b': 'senior',
        r'\bjr\.?\b': 'junior',
        r'\bmid\.?\b': 'mid',
        r'\bdev\.?\b': 'developer',
        r'\beng\.?\b': 'engineer',
    }

    for pattern, replacement in replacements.items():
        title = re.sub(pattern, replacement, title)

    # Usuń znaki specjalne i nadmiarowe spacje
    title = re.sub(r'[^\w\s]', '', title)
    title = re.sub(r'\s+', ' ', title).strip()

    return title


def _detect_changes(self, existing: Job, new_data: dict) -> dict:
    """Wykrywa zmiany między starymi a nowymi danymi"""

    changes = {}
    fields_to_track = ['title', 'salary_min', 'salary_max', 'location', 'url']

    for field in fields_to_track:
        old_value = getattr(existing, field)
        new_value = new_data.get(field)

        if old_value != new_value and new_value is not None:
            changes[field] = (old_value, new_value)

    return changes
```

#### Przykłady Scenariuszy

**Scenariusz 1: Ta sama oferta na 3 portalach**

```
Scraping Run:
  NoFluffJobs:  "Senior Python Developer w Google, Warszawa, 15k-20k"
  JustJoinIT:   "Senior Python Developer w Google, Warszawa, 15k-22k"
  SolidJobs:    "Python Developer (Senior) w Google, Warszawa, 16k-20k"

Po normalizacji:
  Wszystkie 3 → normalized_title="senior python developer", company="Google", location="Warszawa"

Wynik w bazie:
  JobGroup #1:
    ├─ Job #10 (NoFluffJobs,  salary_max=20000)
    ├─ Job #23 (JustJoinIT,   salary_max=22000)  ← Najwyższe salary!
    └─ Job #45 (SolidJobs,    salary_max=20000)

Frontend:
  Użytkownik widzi JEDNĄ ofertę z badge "Dostępna na 3 portalach"
  Może kliknąć i wybrać link (JustJoinIT ma najlepsze salary!)
```

**Scenariusz 2: Oferta wraca po closed (Re-post)**

```
2025-11-01: Job #123 znaleziony (is_active=true, first_seen_at=2025-11-01)
2025-11-15: Job #123 zniknął (is_active=false, closed_at=2025-11-15)
2025-11-22: Job #123 WRÓCIŁ!
  → is_active=true
  → closed_at=null
  → repost_count=1
  → Wszyscy użytkownicy śledzący group_id → seen_as_new=TRUE

Frontend dla użytkownika:
  [Badge: "Nowa oferta"] [Badge: "Re-posted (1x)"]
  Oferta pojawiła się ponownie. Może to być ghosting!
```

**Scenariusz 3: Zmiana salary**

```
2025-11-01: Job #123 salary_max=15000
2025-11-15: Job #123 salary_max=18000

JobHistory:
  | job_id | field_name  | old_value | new_value | changed_at  |
  |--------|-------------|-----------|-----------|-------------|
  | 123    | salary_max  | 15000     | 18000     | 2025-11-15  |

Frontend (Job Details):
  [Tab: Historia zmian]
    15.11.2025: Wynagrodzenie zmienione z 15k na 18k PLN
```

---

## 5. Frontend Architecture (Next.js 14+)

### Routing Structure (App Router)

```
/                           → Landing Page (public)
/login                      → Login Page (public)
/register                   → Registration Page (public, conditional)
/dashboard                  → Jobseeker Dashboard (protected)
  ├── /                     → Job Listings (main view)
  ├── /profile              → Profile Settings
  └── /keywords             → Keywords CRUD
/admin                      → Admin Panel (protected, admin only)
  └── /sources              → Job Sources CRUD
```

### State Management

**Strategia:** Context API + Server Components (Next.js 14+)

- **AuthContext:** Przechowuje stan zalogowania, token, user info.
- **ThemeContext:** Przechowuje motyw (dark/light), syncuje z LocalStorage i profilem użytkownika.
- **Server Components:** Domyślnie server-side rendered, ładują dane po stronie serwera (SEO, performance).
- **Client Components:** Tylko tam gdzie potrzeba interakcji (formularze, drag-and-drop).

### Drag-and-Drop Job List

**Biblioteka:** `@dnd-kit/core` (React DnD moderna alternatywa)

**Flow:**

1. Użytkownik przeciąga wiersz w tabeli.
2. Frontend aktualizuje lokalną kolejność (`display_order`).
3. Wywołuje `PATCH /api/v1/applications/{id}` z nowym `display_order`.
4. Backend zapisuje w bazie.

```tsx
// Przykład komponentu (uproszczony)
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

function JobTable({ jobs, onReorder }) {
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = jobs.findIndex((j) => j.id === active.id);
      const newIndex = jobs.findIndex((j) => j.id === over.id);
      const newJobs = arrayMove(jobs, oldIndex, newIndex);
      onReorder(newJobs); // Update backend
    }
  };

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={jobs} strategy={verticalListSortingStrategy}>
        {/* Render sortable rows */}
      </SortableContext>
    </DndContext>
  );
}
```

### API Client (Axios)

```typescript
// frontend/src/lib/api.ts
import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.jhunt.com";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - dodaj token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - obsługa 401 (token wygasł)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Try refresh token
      // If refresh fails, redirect to /login
    }
    return Promise.reject(error);
  },
);
```

---

## 6. Scraping Architecture

### APScheduler Setup

**Strategia:** Background tasks uruchamiane w tej samej instancji FastAPI (Monolit).

```python
# backend/app/scheduler/jobs.py
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.services.scraper_service import ScraperService

scheduler = AsyncIOScheduler()

async def run_scrapers():
    """Uruchamia wszystkie aktywne scrapery"""
    scraper_service = ScraperService()
    await scraper_service.scrape_all_sources()

def start_scheduler():
    # Uruchom scrapery co 6 godzin
    scheduler.add_job(run_scrapers, 'interval', hours=6)
    scheduler.start()
```

```python
# backend/app/main.py
from fastapi import FastAPI
from app.scheduler.jobs import start_scheduler

app = FastAPI()

@app.on_event("startup")
async def startup_event():
    start_scheduler()
```

**⚠️ Performance Watch:**
Uruchamianie Schedulera wewnątrz procesu API (Monolit) jest OK dla MVP.
Jeśli zużycie RAM na VPS przekroczy 80%, należy wydzielić Workera do osobnego procesu (`python worker.py`) i użyć Redis jako brokera.

### Scraper Base Class

```python
# backend/app/scrapers/base_scraper.py
from abc import ABC, abstractmethod
from typing import List
from app.schemas.job import JobCreate

class BaseScraper(ABC):
    """Abstract base class dla scraperów"""

    def __init__(self, source_url: str):
        self.source_url = source_url

    @abstractmethod
    async def scrape(self) -> List[JobCreate]:
        """Implementacja scrapowania dla konkretnego portalu"""
        pass

    async def fetch_page(self, url: str) -> str:
        """Wspólna metoda do pobierania HTML"""
        # HTTPX async client
        pass
```

### Scraper Service Flow

```
┌──────────────────┐
│  APScheduler     │
│  (Trigger)       │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────┐
│  ScraperService          │
│  .scrape_all_sources()   │
└────────┬─────────────────┘
         │
         ├──► Get active sources from DB
         │
         ├──► For each source:
         │    ├─► Instantiate scraper (NoFluffJobs/SolidJobs/JustJoinIT)
         │    ├─► Call .scrape()
         │    ├─► Parse results
         │    └─► Upsert to DB (jobs table)
         │         ├─► If external_id exists: Update last_seen_at
         │         └─► If new: Insert with first_seen_at
         │
         └──► Mark missing jobs as inactive (closed_at)
```

### Data Deduplication

**Problem:** Ta sama oferta może być wielokrotnie scrapowana.

**Rozwiązanie:** UNIQUE constraint na `(source_id, external_id)`.

```python
# Upsert logic (PostgreSQL)
INSERT INTO jobs (source_id, external_id, title, company, ...)
VALUES (?, ?, ?, ?, ...)
ON CONFLICT (source_id, external_id)
DO UPDATE SET
    last_seen_at = CURRENT_TIMESTAMP,
    is_active = TRUE;
```

### Ghosting Detection

**Definicja:** Oferta aktywna >= 90 dni.

**Implementacja:** Obliczana kolumna w query.

```python
# backend/app/services/job_service.py
def get_jobs_for_user(user_id: int):
    jobs = db.query(Job).filter(
        Job.is_active == True,
        # Match keywords (join with user keywords)
        # Exclude blacklisted companies
    ).all()

    for job in jobs:
        days_active = (datetime.now() - job.first_seen_at).days
        job.is_ghosting = days_active >= 90

    return jobs
```

---

## 7. Infrastructure Architecture

### Cloudflare Configuration

#### DNS Settings

```
Type    Name        Content                 Proxy
A       @           <Vercel IP>             Proxied (Orange Cloud)
CNAME   api         mikrus-vps.domain.com   Proxied (Orange Cloud)
```

#### Firewall Rules (WAF)

```javascript
// Rule 1: Geo-blocking
(ip.geoip.country in {"RU" "CN" "KP" "BY" "IR"}) → Block

// Rule 2: Hosting ASN Block (dla endpointów user-facing)
(cf.bot_management.score < 30) and (ip.geoip.asnum in {14618 16509 ...}) → Challenge

// Rule 3: Rate Limiting - Login
(http.request.uri.path eq "/api/v1/auth/login") → Rate Limit (5 req/min per IP)

// Rule 4: Rate Limiting - API Global
(http.request.uri.path contains "/api/") → Rate Limit (100 req/min per IP)
```

#### Cache Rules

```javascript
// Cache Rule 1: Cache Everything
(hostname eq "jhunt.com") → Cache Everything, Edge TTL: 1 hour

// To zostanie nadpisane przez GitHub Actions (Purge on Deploy)
```

### Vercel Deployment

**Konfiguracja:** `vercel.json`

```json
{
  "buildCommand": "cd frontend && npm run build",
  "outputDirectory": "frontend/.next",
  "framework": "nextjs",
  "env": {
    "NEXT_PUBLIC_API_URL": "https://api.jhunt.com"
  }
}
```

**Automatyczny Deploy:** Vercel automatycznie deployuje po pushu do `main` (integracja GitHub).

### Mikrus VPS Setup

#### Nginx Configuration

```nginx
# /etc/nginx/sites-available/jhunt-backend

upstream fastapi_backend {
    server 127.0.0.1:8000;
}

server {
    listen 443 ssl http2;
    server_name api.jhunt.com;

    ssl_certificate /etc/letsencrypt/live/api.jhunt.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.jhunt.com/privkey.pem;

    location / {
        proxy_pass http://fastapi_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name api.jhunt.com;
    return 301 https://$host$request_uri;
}
```

#### Systemd Service (FastAPI)

```ini
# /etc/systemd/system/jhunt-backend.service

[Unit]
Description=JHunt FastAPI Backend
After=network.target postgresql.service

[Service]
Type=simple
User=jhunt
WorkingDirectory=/home/jhunt/app/backend
Environment="PATH=/home/jhunt/app/backend/venv/bin"
ExecStart=/home/jhunt/app/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 4
Restart=always

[Install]
WantedBy=multi-user.target
```

#### PostgreSQL Setup

```bash
# Instalacja
sudo apt install postgresql postgresql-contrib

# Tworzenie bazy i użytkownika
sudo -u postgres psql
CREATE DATABASE jhunt_db;
CREATE USER jhunt_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE jhunt_db TO jhunt_user;
```

---

## 8. CI/CD Pipeline (GitHub Actions)

### Workflow: Frontend Deploy

```yaml
# .github/workflows/deploy-frontend.yml

name: Deploy Frontend to Vercel

on:
  push:
    branches: [main]
    paths:
      - "frontend/**"
      - ".github/workflows/deploy-frontend.yml"

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./frontend

      - name: Purge Cloudflare Cache
        run: |
          curl -X POST "https://api.cloudflare.com/client/v4/zones/${{ secrets.CF_ZONE_ID }}/purge_cache" \
            -H "Authorization: Bearer ${{ secrets.CF_API_TOKEN }}" \
            -H "Content-Type: application/json" \
            --data '{"purge_everything":true}'
```

### Workflow: Backend Deploy

```yaml
# .github/workflows/deploy-backend.yml

name: Deploy Backend to Mikrus VPS

on:
  push:
    branches: [main]
    paths:
      - "backend/**"
      - ".github/workflows/deploy-backend.yml"

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to VPS via SSH
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /home/jhunt/app
            git pull origin main
            cd backend
            source venv/bin/activate
            pip install -r requirements.txt
            alembic upgrade head
            sudo systemctl restart jhunt-backend
```

---

## 9. Security Architecture

### JWT Token Strategy

**Access Token:**

- Czas życia: 30 minut
- Przechowywany: LocalStorage (Frontend)
- Używany: Każde żądanie API (Authorization header)

**Refresh Token:**

- Czas życia: 7 dni
- Przechowywany: HttpOnly Cookie (bezpieczniejsze)
- Używany: Tylko do odświeżania Access Token

### Password Security

```python
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)
```

### CORS Configuration

```python
# backend/app/main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://jhunt.com"],  # Frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Feature Flags Security

```python
# Backend: Feature flags są TYLKO w .env na serwerze
# Frontend: Nawet jeśli haker ma dostęp do JS, backend waliduje

# Przykład: Ukryj przycisk Register, ale backend i tak weryfikuje
if not settings.ALLOW_REGISTRATION:
    # Frontend może to sprawdzić przez endpoint /api/v1/config
    # ale decyzja należy do backendu
```

---

## 10. Theme & Internationalization

### Dark/Light Mode

**Hierarchia:**

1. **Profil użytkownika (DB)** - jeśli zalogowany
2. **LocalStorage** - jeśli niezalogowany lub nadpisanie lokalne
3. **System (prefers-color-scheme)** - domyślnie

```tsx
// frontend/src/contexts/ThemeContext.tsx
const ThemeProvider = ({ children }) => {
  const { user } = useAuth();
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    // Priority: User Profile > LocalStorage > System
    if (user?.theme_preference) {
      setTheme(user.theme_preference);
    } else {
      const saved = localStorage.getItem("theme");
      if (saved) {
        setTheme(saved);
      } else {
        const systemDark = window.matchMedia(
          "(prefers-color-scheme: dark)",
        ).matches;
        setTheme(systemDark ? "dark" : "light");
      }
    }
  }, [user]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <div className={theme}>{children}</div>
    </ThemeContext.Provider>
  );
};
```

### Language Detection

**Hierarchia:**

1. **Profil użytkownika (DB)** - jeśli zalogowany
2. **Cookie** - ostatni wybór
3. **Accept-Language Header** - ustawienia przeglądarki
4. **Default: PL**

```typescript
// frontend/src/lib/i18n.ts
import { cookies } from "next/headers";

export function detectLanguage(user?: User): "pl" | "en" {
  if (user?.language) return user.language;

  const cookieLang = cookies().get("language")?.value;
  if (cookieLang) return cookieLang as "pl" | "en";

  // Accept-Language header (server-side)
  const acceptLang = headers().get("accept-language");
  if (acceptLang?.startsWith("en")) return "en";

  return "pl"; // Default
}
```

**Biblioteka:** `next-intl` (rekomendowana dla Next.js 14+)

---

## 11. Data Flow Examples

### Przykład 1: Pobieranie Ofert (Job Listing)

```
┌─────────────┐
│   User      │
│ (Browser)   │
└──────┬──────┘
       │ GET /dashboard
       ▼
┌─────────────┐
│  Next.js    │ Server Component
│  (Vercel)   │ ├─► Fetch API: GET /api/v1/jobs
└──────┬──────┘     Authorization: Bearer <token>
       │
       ▼
┌──────────────┐
│  Cloudflare  │ ├─► Check cache (miss)
│              │ └─► Forward to backend
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  FastAPI     │ ├─► Validate JWT → user_id
│  (Mikrus)    │ ├─► Get user keywords
│              │ ├─► Query jobs WHERE:
│              │     │  - title/company ILIKE keywords
│              │     │  - company NOT IN blacklist
│              │     │  - is_active = true
│              │ └─► Return JSON
└──────┬───────┘
       │
       ▼
┌─────────────┐
│   User      │ ← Rendered job list with links
└─────────────┘
```

### Przykład 2: Drag-and-Drop Reorder

```
┌─────────────┐
│   User      │ Drags row #5 to position #2
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Frontend   │ ├─► Update local state (optimistic UI)
│  (Client)   │ ├─► PATCH /api/v1/applications/42
│             │     { display_order: 2 }
└──────┬──────┘
       │
       ▼
┌──────────────┐
│  FastAPI     │ ├─► Validate JWT
│              │ ├─► UPDATE user_job_status
│              │     SET display_order = 2
│              │     WHERE id = 42 AND user_id = <user>
│              │ └─► 200 OK
└──────┬───────┘
       │
       ▼
┌─────────────┐
│  Frontend   │ Confirm change (or rollback if error)
└─────────────┘
```

---

## 12. Monitoring & Observability

### Sentry Integration

**Backend:**

```python
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

sentry_sdk.init(
    dsn=settings.SENTRY_DSN,
    integrations=[FastApiIntegration()],
    environment="production",
)
```

**Frontend:**

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

### Logging

**Backend:** Structured logging (JSON) do stdout → zbierane przez systemd.

```python
import logging
import json

logger = logging.getLogger(__name__)

def log_scraper_run(source: str, jobs_found: int):
    logger.info(json.dumps({
        "event": "scraper_run",
        "source": source,
        "jobs_found": jobs_found,
        "timestamp": datetime.now().isoformat()
    }))
```

---

## 13. Faza Implementacji (Kontekst)

### Faza 1 (MVP - UI/Backend API)

1. Landing Page
2. Registration + Login (z feature flag)
3. Admin Panel - Job Sources CRUD
4. Jobseeker Dashboard:
   - Profile Settings
   - Keywords CRUD
   - Job Listings (Mock data initially)
   - Drag-and-drop reordering

**Cel:** Użytkownik może się zarejestrować, zalogować, skonfigurować profil i zarządzać widokami. Brak scrapowania.

### Faza 2 (Scraping)

1. Implementacja scraperów (NoFluffJobs, SolidJobs, JustJoinIT)
2. APScheduler integration
3. Cron job setup
4. Testowanie dopasowywania ofert

**Cel:** System automatycznie pobiera oferty i prezentuje użytkownikowi.

### Faza 3 (Polish & Scale)

1. Blacklist firm
2. Ghosting detection
3. Export/Import
4. Optymalizacje wydajności
5. Testy E2E

---

## Podsumowanie

Ten dokument definiuje **pełną architekturę** systemu J(ob)Hunt:

- **Struktura repozytorium** (Mono-repo z podziałem backend/frontend)
- **Schema bazy danych** (6 tabel z relacjami)
- **API Endpoints** (Public, Protected, Admin)
- **Autentykacja** (JWT + Feature Flags)
- **Frontend** (Next.js 14 App Router + Drag-and-Drop)
- **Scraping** (APScheduler + Base Scraper Class)
- **Infrastruktura** (Cloudflare + Vercel + Mikrus VPS)
- **CI/CD** (GitHub Actions + Cache Purge)
- **Bezpieczeństwo** (Geo-blocking, Rate Limiting, HTTPS)

Pierwsza faza skupia się na UI i backend API bez scrapowania. Scraping to osobny moduł aktywowany w fazie 2.

---

**Następny krok:** `implementationPlan.md` - szczegółowa lista zadań do wykonania.
