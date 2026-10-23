# People Directory

A small React SSR app with Fastify, esbuild, and a custom caching fetch library.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Configuration (Task 1)](#configuration-task-1)
- [Caching Fetch Library (Task 2)](#caching-fetch-library-task-2)
- [Notes on `npm audit`](#notes-on-npm-audit)
- [Things to improve / Known issues](#things-to-improve--known-issues)
- [Future Enhancements & Next Steps](#future-enhancements--next-steps)

---

## Getting Started

### Prerequisites
- Node.js `^20.x`
- npm `^10.x` or `11.x`

### Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Build and start the server
npm start
```

Open [http://localhost:3000](http://localhost:3000) to view the landing page.

### Available Routes

- **Landing Page** (`/`): Static landing page linking to the two versions of the app.
- **/appWithSSRData**: Loads the data on the server first, renders the full HTML, and hands the cache off to the browser in `window.__INITIAL_DATA__`. Works even with JavaScript turned off.
- **/appWithoutSSRData**: Renders a loading state from the server, then fetches data on the client. Even though `App`, `Person`, and `Name` all call the hook at the same time, it only fires one network request.

---

## Configuration (Task 1)

The repo was pretty bare initially, so I added the standard tooling:

- **TypeScript check**: `npm run typecheck` (`tsc --noEmit`).
- **ESLint**: Flat config in `eslint.config.mjs` with TypeScript support (`npm run lint`).
- **Prettier**: Consistent formatting with `.prettierrc` (`npm run format` / `npm run format:check`).
- **Tests**: Vitest for unit testing `cachingFetch` (`npm test`).
- **Git ignore**: `.gitignore` to keep `dist/`, `node_modules/`, and OS/IDE clutter out of git.
- **Docker**: Added a `Dockerfile` and `docker-compose.yml` (`docker compose up`) for running in a container.

### Scripts

- `npm run build` - builds server and client bundles with esbuild
- `npm start` - builds and starts the Fastify server on port 3000
- `npm run typecheck` - runs `tsc --noEmit`
- `npm run lint` - runs ESLint
- `npm run format` - formats with Prettier
- `npm test` - runs the Vitest suite

---

## Caching Fetch Library (Task 2)

All code lives in `caching-fetch-library/cachingFetch.ts`.

1. **`useCachingFetch(url)`**:
   - Checks the in-memory cache first. If found, returns immediately (this is what lets SSR render synchronously).
   - If a request is already in-flight for that URL, new callers attach to the existing promise instead of making another fetch. This satisfies the requirement that multiple component mounts on `/appWithoutSSRData` only trigger 1 network call.
   - Cleans up properly if the component unmounts before the request resolves.
2. **`preloadCachingFetch(url)`**:
   - Called by the server before `renderToString`. Fetches the data once and puts it into the cache map.
3. **`serializeCache()` & `initializeCache()`**:
   - Server turns the cache map into a JSON string and injects it into `<script>window.__INITIAL_DATA__ = ...</script>`.
   - Browser parses it before hydration so `useCachingFetch` hits the cache right away without hitting the network.
4. **`wipeCache()`**:
   - Clears the map and any pending requests between server requests.

---

## Notes on `npm audit`

Running `npm audit` flags a few vulnerabilities (Fastify, find-my-way, esbuild, Valibot). 

I avoided running `npm audit fix --force` here because:
- **Fastify**: The fix jumps from v4 to v5, which has breaking changes to routing and response handling.
- **Valibot**: Jumps from v0.30 to v1.x, which completely rewrote schema definitions and would break `application/validation.ts`.
- **esbuild**: The advisory is for the built-in dev server, which this project doesn't use (Fastify serves the app).

Since this is a local challenge project with mocked data, these don't pose real security risks here, and keeping the existing framework/application code stable is more important. In a real production migration, upgrading Fastify and Valibot would be handled as dedicated tasks with proper regression testing.

---

## Things to improve / Known issues

A few things worth noting that could be improved in a real production app:

- **Per-request cache scope on the server**: Right now the cache is a module-level Map. `wipeCache()` works for sequential requests, but under concurrent user requests, one request could wipe another's cache. Wrapping the cache in Fastify request context or Node's `AsyncLocalStorage` would solve this.
- **Script injection safety**: The server injects `__INITIAL_DATA__` directly into a `<script>` tag. If the data contained `</script>`, it could break the HTML. Serializing with something like `serialize-javascript` is safer.
- **Cache expiration**: There's currently no TTL or invalidation strategy if data goes stale.
- **Mock Server Handler Bundled in Production**:
   - `mock-server/handler.ts` containing the mocked dataset is bundled into both `server.js` and `client.js`. In production, mock service workers and handlers should be strictly guarded by environment checks (`process.env.NODE_ENV !== 'production'`) to minimize bundle payload size.

---

## Future Enhancements & Next Steps

1. **Incremental Dev Server (Hot Module Replacement)**:
   - Adding an automatic reloader via Vite/Next.js configs or watch script (`esbuild --watch`) would speed up local changes instead of having to rerun `npm start`.
2. **React Query / SWR / TanStack Query**:
   - For enterprise web applications, replace custom caching hooks with battle-tested data fetching solutions supporting hydration, retries, deduplication, and window focus refetching.
3. **CI/CD Automation**:
   - Add GitHub Actions workflow running `npm run typecheck`, `npm run lint`, `npm test`, and `docker build`.