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
-   **GitHub:** System kontroli wersji i główne repozytorium kodu źródłowego projektu.
-   **GitHub Actions:** Automatyzacja CI/CD do automatycznego deployowania każdej nowej wersji aplikacji (frontend do Vercel, backend do Mikrus VPS).
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
-   **JH-13: Obsługa Motywów (Dark/Light Mode):**
    -   Wsparcie dla trybu jasnego i ciemnego.
    -   **Priorytety ustawień:** 1. Profil Użytkownika (Baza), 2. LocalStorage/Cookie (Niezalogowani), 3. Ustawienia Systemowe (prefers-color-scheme).
-   **JH-14: Internacjonalizacja (i18n):**
    -   **Faza 1:** Język Polski (PL) jako domyślny.
    -   **Faza 2:** Dodanie Języka Angielskiego (EN).
    -   **Wykrywanie:** 1. Profil Użytkownika, 2. Cookie (ostatni wybór), 3. Nagłówek przeglądarki (`Accept-Language`), 4. Domyślny (PL). Unikamy geolokalizacji po IP dla języka.

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

---

## 6. Początkowe Źródła Scrapowania

Na starcie projektu system będzie scrapował oferty pracy z następujących portali:

1. **No Fluff Jobs** (nofluffjobs.com) - Portal z ofertami IT bez zbędnych informacji
2. **Solid Jobs** (solidjobs.pl) - Portal skupiony na solidnych ofertach pracy
3. **Just Join IT** (justjoin.it) - Popularny portal z ofertami w branży IT

Lista źródeł będzie rozszerzana w kolejnych iteracjach projektu (feature JH-09: Zarządzanie Źródłami).

---

## 7. Strategia Cache'owania i Odświeżania UI

### Cel
Użytkownik wchodząc na stronę **musi** otrzymać najnowszą wersję aplikacji. Proces jest całkowicie automatyczny i transparentny, bez żadnych akcji po stronie użytkownika.

### Realizacja Techniczna

#### 1. Konfiguracja Cloudflare (Agresywny Cache)
-   **Pełny Cache:** Zarówno assety statyczne, jak i pliki HTML są cache'owane przez Cloudflare dla maksymalnej wydajności i odciążenia serwerów.
-   **Zasada:** Domyślnie serwujemy treść z cache Cloudflare ("Cache Everything").

#### 2. Mechanizm Active Invalidation (Deploy Hook)
-   **Wyzwalacz:** Proces CI/CD (GitHub Actions) po pomyślnym wdrożeniu nowej wersji na Vercel.
-   **Akcja:** GitHub Actions wykonuje zapytanie do API Cloudflare (Purge Cache), czyszcząc cache dla domeny aplikacji.
-   **Efekt:** Stara wersja jest natychmiast usuwana z brzegów sieci (Edge) Cloudflare.

#### 3. Przepływ Danych (Flow)
1.  **Standardowo:** Użytkownik otrzymuje błyskawicznie wersję z cache Cloudflare.
2.  **Deploy:** Nowa wersja trafia na Vercel -> GitHub Actions czyści cache Cloudflare.
3.  **Pierwsze wejście po deployu:** Cloudflare (pusty cache) pobiera nową wersję z Vercel (nowy HTML + nowe hashe assetów) i zapisuje ją w cache.
4.  **Kolejne wejścia:** Użytkownicy otrzymują już nową, zcache'owaną wersję.

#### Podsumowanie
Używamy strategii **"Cache Everything + Purge on Deploy"**. Zapewnia to najwyższą możliwą wydajność (nawet HTML z cache'u) przy gwarancji, że po wdrożeniu nowej wersji, użytkownicy natychmiast (od pierwszego zapytania) otrzymają zaktualizowaną aplikację.

---

## 8. Polityka Bezpieczeństwa i Geolokalizacja (Cloudflare WAF)

### Geolokalizacja i Blokowanie Ruchu
Konfiguracja Firewall Rules (WAF) w Cloudflare ma na celu eliminację ruchu z regionów wysokiego ryzyka oraz ruchu nieorganicznego.

-   **Kraje Blokowane (High Risk):**
    -   Rosja (RU)
    -   Chiny (CN)
    -   Korea Północna (KP)
    -   Białoruś (BY)
    -   Iran (IR)
-   **Akcja:** `Block` (całkowite odrzucenie połączenia).

### Filtrowanie Ruchu i Ochrona
-   **Bot Fight Mode:** Włączony tryb ochrony przed znanymi botami.
-   **Hosting/Cloud ASN Block:** Blokowanie ruchu pochodzącego z numerów ASN przypisanych do centrów danych (np. AWS, DigitalOcean, Hetzner) dla endpointów użytkownika, aby wyeliminować boty udające ludzi.
-   **Rate Limiting:**
    -   Limit zapytań dla endpointu `/api/auth/login` (ochrona przed Brute Force).
    -   Globalny limit zapytań na IP (ochrona przed Scrapingiem/DDoS).
-   **TLS/SSL:** Wymuszone HTTPS (HSTS) i minimum TLS 1.2.
