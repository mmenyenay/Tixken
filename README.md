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

## Known issues

Two flows are built and calling the sandbox, but currently blocked. Both are being actively worked with the Brickken team.

**Door scan, mobile wallet compatibility.** The scan-and-burn flow works against the sandbox (confirmed via direct API testing, a burn transaction succeeded), but connecting through a mobile browser's injected wallet currently fails inconsistently: a generic RPC error in Brave's built-in wallet, a JS TypeError in Mises Browser's built-in wallet, and a different JS TypeError in MetaMask's own mobile app browser. The client code itself was audited line by line, no unsupported method calls, correctly formatted `wallet_switchEthereumChain`/`wallet_addEthereumChain` requests per spec. The failure point traces to how each mobile wallet's own injected provider handles the request, not to a bug in this codebase. Reported to Brickken's team for a second opinion, and desktop MetaMask testing is pending.

**Resale, whitelist call rejected by the sandbox.** The full resale flow is implemented and wired end to end: list a ticket, prepare a transfer, whitelist the buyer if needed, confirm the transfer. The standalone `whitelist` prepare call consistently returns `Can't find a tokenizer associated to the given company wallet address`, even though the signer address, chain ID, and company wallet on file for the token all verify as correct, and the identical error reproduces across two independent browsers and wallets on a freshly tokenized event. This points to a sandbox-side issue rather than a client bug, and has been reported to Brickken's team.

## Surfaces used

This project uses two of Brickken's developer surfaces, both REST, no MCP or CLI calls made directly from application code (the CLI-equivalent `set-executor-action` call was made through the REST endpoint, see below).

### REST API (Dapp)

Against `https://api.sandbox.brickken.com`, for the ticketing side. Methods called through `POST /prepare-transactions` and `POST /send-transactions`:

- `newTokenization` - create the ticket token for an event
- `whitelist` - approve an attendee or buyer wallet before it can hold a ticket, used both inside the mint flow and standalone ahead of a resale transfer
- `mintToken` - issue a ticket, using the `needWhitelist` flag to combine whitelisting and minting in one call
- `burnToken` - close out a scanned ticket, confirmed working with a real Sepolia transaction
- `transferTo` - move a ticket from the current holder to a resale buyer, seller-signed
- `approve` - authorize the RAMS executor to spend an event's token contract, prepared, not yet confirmed end to end pending the executor signing key question below

Read calls used:
- `GET /get-transaction-status`
- `GET /get-whitelist-status`
- `GET /get-token-info`

### REST (Agentic)

REST against the Agentic API (`https://api.sandbox.brickken.com/x402/...`), client-signed mode using the API key, no x402 payment required:

- `POST /x402/agent/register`, to register the reclaim agent's ERC-8004 identity
- `POST /x402/rams/set-executor-action`, prepared for both selectors the agent needs (`transferFrom` for credit-mode reclaim, `burnFrom` for burn-mode reclaim), not yet confirmed executed end to end, see below

**RAMS mandate status:** the mechanics are fully confirmed with Brickken's team, both selectors (`transferFrom` at `0x23b872dd`, `burnFrom` at `0x79cc6790`), the approve step, and the mandate registration call. What's blocking execution is confirming which wallet actually signs as the executor address, `AGENT_EXECUTOR_ADDRESS` was issued by Brickken as part of the RAMS credential set rather than generated locally, and it isn't yet confirmed whether it's a contract callable through the agent's own key or a separate wallet needing its own key from Brickken. Question is open with Brickken's team as of this submission. Once resolved, wiring the mandate check into the existing reclaim job is a mechanical change, the branching logic and both prepare functions are already written.

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
- Real transaction hashes from working flows (tokenization, minting, burning) will be listed here before final submission, pulled from live Railway logs and Sepolia Etherscan to keep them verifiable against Brickken's own records
- EVM wallet address for reward consideration: to be added before submission

## AI tools disclosure

An AI assistant (Claude) was used

## What is not built yet

- Mobile wallet compatibility for Door Scan across non-MetaMask injected wallets (see Known Issues)
- Resale whitelist call, blocked on a sandbox-side issue reported to Brickken (see Known Issues)
- RAMS mandate execution wiring into the reclaim job, blocked on confirming the executor signing key (see Surfaces Used)
- Resale price cap enforcement through the RAMS mandate itself, currently enforced at the application layer only
- Automated tests against the sandbox
- Full UI polish and mobile optimization
- An assertion in the resale confirm route that the signing wallet matches the ticket's recorded holder before accepting a transfer confirmation
