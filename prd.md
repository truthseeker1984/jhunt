# Product Requirements Document: J(ob)Hunt

**Wersja:** 3.0 (skonsolidowana)
**Data:** 22 listopada 2025

---

## 1. Overview

-   **Cel:** Stworzenie inteligentnej platformy agregującej oferty pracy, dopasowującej je do profilu użytkownika i ułatwiającej śledzenie procesu rekrutacji.
-   **Opis:** Aplikacja webowa, która automatycznie skanuje wybrane portale z ogłoszeniami, prezentując użytkownikowi spersonalizowaną listę ofert i narzędzia do zarządzania aplikacjami.

---

## 2. Wybrany tech stack

### Architektura i Backend
-   **Architektura:** **Monolit** - Upraszcza development i obniża koszty na początkowym etapie.
-   **Python 3.11+:** Główny język backendu z bogatym ekosystemem.
-   **FastAPI:** Nowoczesny framework do budowy wydajnego REST API.
-   **PostgreSQL:** Relacyjna baza danych do przechowywania wszystkich danych aplikacji.
-   **SQLAlchemy:** ORM do interakcji z bazą danych w sposób obiektowy i bezpieczny.
-   **Alembic:** Narzędzie do zarządzania migracjami (zmianami) w schemacie bazy danych.
-   **BeautifulSoup + HTTPX:** Biblioteki do scrapingu (pobierania i parsowania) ofert pracy.
-   **APScheduler:** Biblioteka do harmonogramowania zadań w tle (cykliczny scraping).
-   **JWT (python-jose + passlib):** Standard do bezpiecznej autentykacji użytkowników.

### Frontend
-   **Next.js 14+:** Framework oparty na Reakcie do budowy szybkiego i zoptymalizowanego frontendu.
-   **TypeScript:** Dodaje statyczne typowanie do JavaScriptu, zwiększając bezpieczeństwo i jakość kodu.
-   **React-Bootstrap:** Biblioteka gotowych komponentów UI, przyspieszająca development.
-   **Tailwind CSS:** Framework CSS "utility-first" do szybkiego i spójnego stylowania interfejsu.
-   **Axios:** Klient HTTP do komunikacji frontendu z backendem.
-   **Walidacja formularzy:** Wykorzystanie natywnej walidacji HTML5 + Bootstrap - prostsze rozwiązanie lepiej wspierane przez AI.

### Infrastruktura i DevOps
-   **Cloudflare:** Działa jako pierwsza linia obrony (WAF, DDoS) i CDN dla całej aplikacji.
-   **Vercel:** Platforma do darmowego i zautomatyzowanego hostingu aplikacji frontendowej.
-   **Mikrus VPS:** Tani serwer do hostingu backendu i bazy danych.
-   **Nginx:** Działa jako reverse proxy na serwerze backendu, zarządzając ruchem i certyfikatami SSL.
-   **Sentry:** Narzędzie do monitorowania błędów w czasie rzeczywistym.

---

## 3. Data Management

-   **Przechowywanie ofert:** Oferty pracy nie są usuwane z bazy danych. Zamiast tego, są oznaczane statusem `active` lub `closed`. Zapewnia to pełną historię i umożliwia analizę danych.
-   **Cykl życia oferty:** Nowo znaleziona oferta otrzymuje status `active`. Status zmienia się na `closed`, gdy oferta zniknie z portalu źródłowego lub minie jej data ważności.
-   **Minimalizacja danych:** Przechowywane są tylko kluczowe informacje o ofercie (tytuł, firma, link, lokalizacja, wynagrodzenie), bez pełnego opisu, aby utrzymać bazę danych małą i wydajną.    Data rozpoczęcia i data zakończenia oferty/rekrutacji.

---

## 4. Features

-   **JH-01: Rejestracja i Logowanie Użytkownika:** Bezpieczne zakładanie konta i logowanie za pomocą e-maila i hasła.
-   **JH-02: Zarządzanie Słowami Kluczowymi:** Użytkownik definiuje słowa kluczowe (np. "Project Manager"), które służą do filtrowania ofert.
-   **JH-03: Automatyczny Scraping Ofert:** System cyklicznie pobiera oferty pracy z predefiniowanych portali.
-   **JH-04: Dopasowywanie i Wyświetlanie Ofert:** Użytkownik widzi listę ofert dopasowanych do jego słów kluczowych.
-   **JH-05: Śledzenie Aplikacji:** Użytkownik może oznaczać, na które oferty zaaplikował, oraz ustawić status procesu rekrutacji (np. "w procesie", "odrzucono").
-   **JH-06: Dodawanie Notatek do Aplikacji:** Możliwość dodania prywatnych notatek do każdej śledzonej aplikacji.
-   **JH-07: Blacklista Firm:** Użytkownik może zdefiniować listę firm, których ofert nie chce widzieć.
-   **JH-08: Wykrywanie "Ghostingu":** System oznacza oferty, które są aktywne przez podejrzanie długi czas (np. >= 90 dni).
-   **JH-09: Zarządzanie Źródłami (Admin):** Panel dla administratora do zarządzania listą scrapowanych portali.
-   **JH-10: Zgodność z RODO:** Wymóg prawny - użytkownik musi móc wyeksportować swoje dane (JSON/CSV) oraz zażądać ich usunięcia (art. 15, 17, 20 RODO).
-   **JH-11: Import Aplikacji z Excel:** Możliwość zaimportowania historii aplikacji z pliku Excel dla użytkowników migrujących z innych rozwiązań.
-   **JH-12: Export/Backup Danych:** Funkcja eksportu wszystkich danych użytkownika jako backup, szczególnie istotna we wczesnych fazach rozwoju aplikacji.

---

## 5. Architektura i Komunikacja

```ascii
Użytkownik (Przeglądarka)
       |
       v
  [ Cloudflare ] (DNS, WAF, DDoS Protection)
       |
       +---------------------+
       |                     |
       | (frontend requests) | (/api requests)
       v                     v
   [ Vercel ]           [ Mikrus VPS ]
  (Next.js FE)               |
                             v
                        [ Nginx ] (Reverse Proxy, SSL)
                             |
                             v
                        [ Uvicorn ] (ASGI Server)
                             |
                             v
                        [ FastAPI ] (Backend App)
                             |
                   +---------+---------+
                   |                   |
             [ PostgreSQL ]      [ APScheduler ]
             (Baza Danych)       (Scraping Jobs)
```
