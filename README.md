# Tixken

Tokenized event tickets built on Brickken sandbox infrastructure. A host creates an event, ticket tokens get minted and whitelisted, attendees scan a QR code to enter, and an autonomous agent under a RAMS mandate reclaims anything unused once the event closes, either burning it or converting it into a credit for the next event.

Built for the Build with Brickken Challenge, API and Agentic tracks.

Live: https://tixken-production.up.railway.app
Repo: https://github.com/mmenyenay/Tixken

## What it does

- Host tokenizes an event and mints one ticket token per attendee
- Each ticket comes with a QR code, scanned at the door to confirm entry
- Tickets can be listed for resale, capped at a price set by the host, seller's own wallet signs the transfer
- Telegram and email fire on new events, entry confirmations, and reclaims
- A leaderboard ranks attendees by events attended
- Once the event deadline passes, an ERC-8004 agent holding a RAMS mandate is designed to automatically reclaim any ticket that was never scanned, either burning it or converting it into a loyalty credit, depending on how the host configured the event. Mandate integration status is below.

## Known issues, disclosed honestly rather than hidden

**Door scan, mobile wallet compatibility.** The scan-and-burn flow works against the sandbox (confirmed via direct API testing, a real burn transaction succeeded), but connecting through a mobile browser's injected wallet currently fails inconsistently across Brave, Mises Browser, and MetaMask's own app browser, each with a different error. The client code itself was audited line by line and checks out clean, the failure traces to how each mobile wallet's own injected provider handles the request.

**Resale, whitelist call.** The full resale flow is implemented and wired end to end: list a ticket, prepare a transfer, whitelist the buyer, confirm the transfer. An earlier sandbox-side issue with the tokenizer wallet lookup has since been fixed by Brickken's team, and a client-side gating bug that skipped the whitelist step for new buyers has also been fixed.

## Surfaces used

This project uses two of Brickken's developer surfaces, both REST, no MCP or CLI calls made directly from application code (the CLI-equivalent `set-executor-action` call was made through the REST endpoint, see below).

### REST API (Dapp)

Against `https://api.sandbox.brickken.com`, for the ticketing side. Methods called through `POST /prepare-transactions` and `POST /send-transactions`:

- `newTokenization` - create the ticket token for an event
- `whitelist` - approve an attendee or buyer wallet before it can hold a ticket, used both inside the mint flow and standalone ahead of a resale transfer
- `mintToken` - issue a ticket, using the `needWhitelist` flag to combine whitelisting and minting in one call
- `burnToken` - close out a scanned ticket, confirmed working with a real Sepolia transaction
- `transferTo` - move a ticket from the current holder to a resale buyer, seller-signed
- `approve` - authorize the RAMS executor to spend an event's token contract

Read calls used:
- `GET /get-transaction-status`
- `GET /get-whitelist-status`
- `GET /get-token-info`

### REST (Agentic)

REST against the Agentic API (`https://api.sandbox.brickken.com/x402/...`), client-signed mode using the API key, no x402 payment required:

- `POST /x402/agent/register`, to register the reclaim agent's ERC-8004 identity
- `POST /x402/rams/set-executor-action`, mandate registration for both selectors the agent needs (`transferFrom` for credit-mode reclaim at `0x23b872dd`, `burnFrom` for burn-mode reclaim at `0x79cc6790`)
- `POST /prepare-transactions` with `method: "ramsExecute"`, the actual delegated execution call, signed by the agent's own wallet with the executor address passed explicitly, since the executor is a smart contract with no private key of its own

## How the reclaim decision works

The host sets a reclaim mode per event at creation time: `burn` or `credit`. The agent never decides this itself, it only enforces whatever the host already configured. This keeps the autonomous part of the system auditable:
- The agent's authority is scoped to one action per mode
- Frequency is capped by the mandate
- Every run is checked against `rams_can_execute` before anything happens on chain, once the mandate wiring above is complete. Prior to that, the reclaim job calls the Dapp API directly with no mandate layer, real and verifiable, just not yet delegated

## Running it

1. Clone the repo and run `npm install`
2. Copy `.env.example` to `.env` and fill in:
   - Your sandbox API key
   - Signer wallet private key and address
   - Agent wallet address and private key
   - RAMS identity reference and executor address, from Brickken
   - Notification credentials (Telegram, email)
3. Run `npm start`
4. Create an event: `POST /api/events`
5. Issue a ticket: `POST /api/tickets`
6. Scan a ticket at the door: `POST /api/scan/prepare` then `POST /api/scan/confirm` (see known issues above for mobile wallet caveats, works reliably via direct API calls)
7. List a ticket for resale: `POST /api/resale/list`
8. Check the leaderboard: `GET /api/leaderboard`
9. The reclaim job runs automatically every hour once an event's `endsAt` time has passed, or trigger it manually: `node src/agent/reclaimJob.js`

Full request bodies for each endpoint are in the route files under `src/routes/`.

## Tech stack

- Node.js, Express
- ethers (local transaction signing)
- Brickken Dapp API (REST) and Agentic API (REST)
- qrcode (ticket QR generation)
- Html5-Qrcode (browser QR camera scanning)
- node-telegram-bot-api and nodemailer (notifications)
- node-cron (scheduled reclaim job)
- lowdb (local store, persisted via a Railway Volume on the live deployment)

## Chain and verification

- Network: Ethereum Sepolia (`aa36a7`) for all Dapp API calls and RAMS operations, per the campaign's sandbox scope
- Real transaction hashes from working flows will be listed here before final submission, pulled from live Railway logs and Sepolia Etherscan to keep them verifiable against Brickken's own records
- EVM wallet address for reward consideration: to be added before submission

## AI tools disclosure

An AI assistant (Claude) was used.

## What is not built yet

- Mobile wallet compatibility for Door Scan across non-MetaMask injected wallets (see Known Issues)
- RAMS mandate execution end-to-end testing, code is written and wired, not yet confirmed running live
- Resale price cap enforcement through the RAMS mandate itself, currently enforced at the application layer only
- Automated tests against the sandbox
- Full UI polish and mobile optimization
- An assertion in the resale confirm route that the signing wallet matches the ticket's recorded holder before accepting a transfer confirmation
