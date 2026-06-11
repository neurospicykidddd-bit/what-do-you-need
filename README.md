# what do you need

a single-page app where you type in whatever's bothering you and a persona
replies: dry, unbothered, hyper-literal, quietly perceptive. it registers what
you said, names the thing under the thing, and hands you the dumb-but-true next
move. think "if google was a guy."

built with vite + react. the model call goes through a serverless function so
the api key never touches the browser.

## setup

1. install deps:

   ```sh
   npm install
   ```

2. add your key. copy the example env file and fill it in:

   ```sh
   cp .env.example .env
   # then edit .env and set ANTHROPIC_API_KEY=sk-ant-...
   ```

   never commit `.env` — it's gitignored.

## run it locally

```sh
npm run dev
```

this starts two things:

- the local api backend (`dev-server.js`) on `http://localhost:3001`
- the vite dev server on `http://localhost:5173`

vite proxies `/api/*` to the backend, so open **http://localhost:5173**.

> if your shell doesn't like the `&` in the `dev` script, run the two halves in
> separate terminals instead: `npm run dev:api` and `npm run dev:web`.

## where the anthropic call happens

the browser **never** calls anthropic and never sees the key. the frontend only
ever `POST`s to `/api/chat`. that endpoint — `api/chat.js` — reads
`ANTHROPIC_API_KEY` from the environment and is the only thing that talks to
`api.anthropic.com`. locally that handler runs inside `dev-server.js`; on vercel
it runs as a serverless function.

request details (all server-side, in `api/chat.js`):

- model: `claude-sonnet-4-6`
- `max_tokens`: 400, `temperature`: 1
- the persona as the `system` field
- the running `messages` array, for light back-and-forth

to give it more bite later, change the `model` in `api/chat.js` to
`claude-opus-4-8`.

## deploy to vercel

1. push this repo to github and import it in vercel (it auto-detects vite and
   the `/api` function — no extra config needed).
2. in vercel project settings → environment variables, add
   `ANTHROPIC_API_KEY`. do **not** put it in the client bundle.
3. deploy.

## scope (v1)

no login, no database, no saved history, no analytics. one persona, one
conversation at a time, resets on refresh. the whole goal is the feel of talking
to it.
