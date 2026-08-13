# Tixken

Tokenized event tickets built on Brickken sandbox infrastructure. A host creates an event, ticket tokens get minted and whitelisted, attendees scan a QR code to enter, and an autonomous agent under a RAMS mandate reclaims anything unused once the event closes, either burning it or converting it into a credit for the next event.

Built for the Build with Brickken Challenge, API and Agentic tracks.

## What it does

- Host tokenizes an event and mints one ticket token per attendee
- Each ticket comes with a QR code, scanned at the door to confirm entry
- Tickets can be transferred or resold, capped at a price set by the host
- Telegram and email fire on new events, entry confirmations, and reclaims
- A leaderboard ranks attendees by events attended
- Once the event deadline passes, an ERC-8004 agent holding a RAMS mandate automatically reclaims any ticket that was never scanned, either burning it or converting it into a loyalty credit, depending on how the host configured the event

## Surfaces used

This project uses two of Brickken's developer surfaces.

### REST API (Dapp)

Against `https://api.sandbox.brickken.com`, for the ticketing side. Methods called through `POST /prepare-transactions` and `POST /send-transactions`:

- `newTokenization` - create the ticket token for an event
- `whitelist` - approve an attendee wallet before it can hold a ticket
- `mintToken` - issue a ticket
- `burnToken` - close out a scanned ticket or reclaim an unused one
- `transferFrom` - move an unused ticket back to the organizer wallet when reclaim mode is set to credit

Read calls used:
- `GET /get-transaction-status`
- `GET /get-whitelist-status`
- `GET /get-token-info`

### REST (Agentic)

REST against the Agentic API (`https://api.sandbox.brickken.com/x402/...`),
client-signed mode using the API key, no x402 payment required:

- `POST /x402/agent/register`, to register the reclaim agent's ERC-8004 identity
  on Base Sepolia

  RAMS mandate enforcement (Ethereum Sepolia) is scoped but not completed, it
  depends on ComplianceProvider and AgentExecutor roles that appear to be
  admin-level on Brickken's sandbox, question is open in Brickken's Discord
  tech-chat channel as of this submission.

## How the reclaim decision works

The host sets a reclaim mode per event at creation time: `burn` or `credit`. The agent never decides this itself, it only enforces whatever the host already configured. This keeps the autonomous part of the system auditable:
- The agent's authority is scoped to one action
- Frequency is capped by the mandate
- Every run is checked against `rams_can_execute` before anything happens on chain

## Running it

1. Clone the repo and run `npm install`
2. Copy `.env.example` to `.env` and fill in:
   - Your sandbox API key
   - Signer wallet private key and address
   - Agent wallet address
   - Notification credentials (Telegram, email)
3. Run `npm start`
4. Create an event: `POST /api/events`
5. Issue a ticket: `POST /api/tickets`
6. Scan a ticket at the door: `POST /api/scan`
7. Check the leaderboard: `GET /api/leaderboard`
8. The reclaim job runs automatically every hour once an event's `endsAt` time has passed, or trigger it manually: `node src/agent/reclaimJob.js`

Full request bodies for each endpoint are in the route files under `src/routes/`.

## Tech stack

- Node.js, Express
- ethers (local transaction signing)
- Brickken Dapp API (REST)
- Brickken hosted MCP server (agentic)
- qrcode (ticket QR generation)
- node-telegram-bot-api and nodemailer (notifications)
- node-cron (scheduled reclaim job)
- lowdb (local store)

## AI tools disclosure

Parts of this project's scaffolding, including the initial route structure and the MCP client wiring, were drafted with AI assistance and then reviewed and adapted by the developer. All Brickken sandbox calls were built against the live API and MCP documentation and tested against the sandbox environment directly.

## What is not built yet

- API for resale flow (routes are prepared, but frontend integration pending)
- Resale price cap enforcement through the RAMS mandate
- Automated tests against the sandbox
- Full UI polish and mobile optimization