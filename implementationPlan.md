# Implementation Plan: J(ob)Hunt

**Wersja:** 2.0  
**Data:** 22 listopada 2025  
**Bazuje na:** PRD v3.0 & Architecture v1.0

---

## Faza 0: Infrastructure & Live Deploy Setup

**Cel:** Uruchomienie "szkieletu" aplikacji na produkcji (Vercel + VPS) od pierwszego dnia.

### 0.1. Repository & Config

- [x] Inicjalizacja Git.
- [ ] Konfiguracja `.env` (Backend) i `.env.local` (Frontend).
- [x] Struktura katalogów.

### 0.2. Production Infrastructure Setup

- [x] **Mikrus VPS (Backend):**
  - [x] Instalacja Python 3.12, PostgreSQL.
  - [x] Konfiguracja domeny `api.jhunt.pl` (Cloudflare Tunnel).
  - [ ] Konfiguracja bazy danych (User, DB, Partycjonowanie).
  - [ ] Zmienna środowiskowa `ADMIN_EMAILS` w `.env`.
- [x] **Vercel (Frontend):**
  - [x] Podłączenie repozytorium GitHub.
  - [x] Konfiguracja domeny `jhunt.pl`.
- [x] **GitHub Actions (CI/CD):**
  - [x] `deploy-backend.yml` (SSH do Mikrus).
  - [x] `deploy-frontend.yml` (Vercel Native Integration).
  - [x] Test: Pusty "Hello World" deployuje się automatycznie.

---

## Faza 0.5: Data Modeling & Class Design (Critical Step)

**Cel:** Zaprojektowanie fundamentów systemu (baza danych + klasy) przed napisaniem jakiejkolwiek logiki biznesowej.

⚠️ **WARUNEK STOP:** Przejście do implementacji (Faza 1) jest możliwe **DOPIERO po zatwierdzeniu** przez Użytkownika:
1. Diagramu ERD (tabel bazy danych) w Mermaid.
2. Definicji klas backendowych i ich pól.

### 0.5.1. Backend Class Design
- [ ] Zidentyfikowanie kluczowych encji na podstawie priorytetów funkcjonalnych.
- [ ] Zaprojektowanie klas Pydantic/SQLAlchemy (pola, typy, relacje).

### 0.5.2. Database Schema Design
- [ ] Stworzenie diagramu ERD w Mermaid.
- [ ] Uwzględnienie partycjonowania i indeksów.
- [ ] Weryfikacja zgodności z PRD.

---

## Faza 1: Landing Page & User Onboarding (Frontend-First)

**Cel:** Użytkownik wchodzi, rejestruje się i konfiguruje profil.

### 1.0. Under construction (Public)

- [ ] Landing page z przyciskiem logowania tylko dla pierwszych testowych userów. Na środku grafika z "Under Construction".

### 1.1. Landing Page (Public)

- [ ] Implementacja Layoutu (Header/Footer).
- [ ] **Feature:** Przełącznik Motywu (Dark/Light) - działa i pojawia się tylko dla zalogowanych. Dla niezalogowanych domyślny motyw z przeglądarki lub jasny.
- [ ] Treść Landing Page (Hero section).
- [ ] Przycisk "Zaloguj / Dołącz".

### 1.2. Authentication Flow

- [ ] Strona Logowania (`/login`) - formularz + link do rejestracji.
- [ ] Strona Rejestracji (`/register`):
  - [ ] Formularz rejestracji.
  - [ ] Obsługa błędu, jeśli rejestracja wyłączona (Feature Flag).
- [ ] Integracja z API (Backend Stub dla Auth).

### 1.3. Backend Auth Implementation

- [ ] Modele `User` i `UserRoles`.
- [ ] Endpointy: `register`, `login`, `refresh`.
- [ ] Walidacja `ALLOW_REGISTRATION`.
- [ ] Obsługa ról (domyślnie `JobSeeker` przy rejestracji).

### 1.4. User Profile & Context Switching

- [ ] Przekierowanie po logowaniu:
  - [ ] Jeśli brak słów kluczowych → `/dashboard/profile` (Onboarding).
  - [ ] Jeśli są → `/dashboard`.
- [ ] Strona Profilu (`/dashboard/profile`):
  - [ ] Zmiana danych (hasło, motyw, język).
  - [ ] **Feature:** Przełącznik Ról (Context Switcher) - jeśli użytkownik ma >1 rolę.
- [ ] Backend Endpoint: `POST /switch-role`.

---

## Faza 2: Job Seeker Core Features

**Cel:** Użytkownik konfiguruje czego szuka i zarządza aplikacjami.

### 2.1. Keywords Management

- [ ] Strona `/dashboard/keywords`.
- [ ] CRUD Słów Kluczowych (Frontend + Backend).
- [ ] Walidacja (np. min. 3 znaki).

### 2.2. Dashboard (Job Listings)

- [ ] Główny widok `/dashboard`.
- [ ] Wyświetlanie ofert (na razie Mock Data lub puste).
- [ ] Filtrowanie po słowach kluczowych.

### 2.3. My Applications (Tracking)

- [ ] Tabela "Moje Aplikacje".
- [ ] **Feature:** Drag-and-Drop (zmiana kolejności).
- [ ] Zmiana statusu (Applied, Interview, Rejected).
- [ ] Dodawanie notatek.
- [ ] Backend: Obsługa `UserJobStatus` i walidacja relacji `group_id`.

---

## Faza 3: Scraping Engine (Backend Heavy)

**Cel:** Zasilenie systemu prawdziwymi danymi.

### 3.1. Scraper Infrastructure

- [ ] `APScheduler` setup.
- [ ] `JobGroup` i `Job` models (z partycjonowaniem).
- [ ] Cloudflare R2 client (dla logo).

### 3.2. Scrapery & Logika

- [ ] Implementacja scraperów (NoFluffJobs, SolidJobs, JustJoinIT).
- [ ] Logika deduplikacji (`_normalize_title`).
- [ ] Logika aktualizacji i historii zmian.
- [ ] Wykrywanie Re-postów.

### 3.3. Admin Panel

- [ ] Zarządzanie źródłami scrapowania (tylko dla Adminów z `.env`).

---

## Faza 4: Polish & Security

**Cel:** Szlify końcowe.

### 4.1. UX Improvements

- [ ] Badge "Re-posted", "Ghosting".
- [ ] Timeline historii zmian.
- [ ] Wybór portalu przy aplikowaniu (Dropdown z linkami).

### 4.2. Security Hardening

- [ ] WAF Rules (Geo-blocking).
- [ ] Rate Limiting.
- [ ] Sentry Integration.
