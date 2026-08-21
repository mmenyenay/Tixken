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
- Once the event deadline passes, an ERC-8004 agent holding a RAMS mandate reclaims any ticket that was never scanned, either burning it or converting it into a loyalty credit, depending on how the host configured the event. Mandate setup is fully live on-chain, end-to-end execution testing is still in progress, see below

## Confirmed working end to end

Tokenizing an event, minting a ticket, scanning it at the door, and listing/transferring a ticket for resale have all been tested live against the sandbox with real Sepolia transactions, including a full successful resale transfer and a real door scan burn. Door scan works from both MetaMask's mobile in-app browser and the desktop browser extension, once the prepared transaction is normalized into the wallet's expected format (see note below).

## A note on wait times, this is sandbox behavior, not application slowness

Tokenizing an event is a single transaction and is usually the fastest action in the app. Getting a ticket, scanning at the door, and reselling each involve two or more sequential on-chain steps (a whitelist transaction confirming, followed by the app polling until Brickken's own read side reflects that confirmation, before a second transaction is prepared and sent). Each step waits for real confirmation on Sepolia before moving to the next, so these actions can take anywhere from under a minute to several minutes depending on how quickly the sandbox confirms and indexes each step. This is expected, not a failure, the app is built to wait rather than proceed on stale data, since proceeding early was the cause of several bugs found and fixed during development. Freshly created tokens in particular can take longer than older ones before resale's whitelist check catches up, this is Brickken's sandbox indexing the new token, not the app.

## Surfaces used

This project uses two of Brickken's developer surfaces, both REST, no MCP or CLI calls made directly from application code (the CLI-equivalent `set-executor-action` call was made through the REST endpoint, see below).

### REST API (Dapp)

Against `https://api.sandbox.brickken.com`, for the ticketing side. Methods called through `POST /prepare-transactions` and `POST /send-transactions`:

- `newTokenization` - create the ticket token for an event
- `whitelist` - approve an attendee or buyer wallet before it can hold a ticket, used both inside the mint flow and standalone ahead of a resale transfer
- `mintToken` - issue a ticket, using the `needWhitelist` flag to combine whitelisting and minting in one call
- `burnToken` - close out a scanned ticket, confirmed working with a real Sepolia transaction
- `transferTo` - move a ticket from the current holder to a resale buyer, seller-signed, confirmed working with a real completed transfer
- `approve` - authorize the RAMS executor to spend an event's token contract, confirmed with a real transaction

Read calls used:
- `GET /get-transaction-status`
- `GET /get-whitelist-status`
- `GET /get-token-info`

### REST (Agentic)

REST against the Agentic API (`https://api.sandbox.brickken.com/x402/...`), client-signed mode using the API key, no x402 payment required:

- `POST /x402/agent/register`, to register the reclaim agent's ERC-8004 identity
- `POST /x402/rams/set-executor-action`, mandate registration for both selectors the agent needs (`transferFrom` for credit-mode reclaim at `0x23b872dd`, `burnFrom` for burn-mode reclaim at `0x79cc6790`), confirmed live on-chain
- `POST /prepare-transactions` with `method: "ramsExecute"`, the actual delegated execution call, signed by the agent's own wallet with the executor address passed explicitly since the executor is a smart contract with no private key of its own. Code is written and wired into the reclaim job, live end-to-end test still in progress

## How the reclaim decision works

The host sets a reclaim mode per event at creation time: `burn` or `credit`. The agent never decides this itself, it only enforces whatever the host already configured. This keeps the autonomous part of the system auditable:
- The agent's authority is scoped to one action per mode
- Frequency is capped by the mandate
- Every run is checked against `rams_can_execute` before anything happens on chain, once mandate execution testing above is fully confirmed. Prior to that, the reclaim job can also call the Dapp API directly with no mandate layer, real and verifiable, just not delegated

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
6. Scan a ticket at the door: `POST /api/scan/prepare` then `POST /api/scan/confirm`
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
- Confirmed real transaction hash, RAMS executor approval: `0x832c841812b847493dc3b16900185be3a9aec8ae661d0fb7c54d7f154631c7e3`
- Additional transaction hashes from tokenization, minting, door scan, and resale will be added here before final submission
- EVM wallet address for reward consideration: to be added before submission

## AI tools disclosure

An AI assistant (Claude) was used.

## What is not built yet

- RAMS mandate live end-to-end reclaim execution test, the mandate itself is registered and approved on-chain, and the execution code is written and wired into the reclaim job, a real triggered reclaim through the mandate has not yet been confirmed
- Resale price cap enforcement through the RAMS mandate itself, currently enforced at the application layer only
- Automated tests against the sandbox
- Full UI polish and mobile optimization
- An assertion in the resale confirm route that the signing wallet matches the ticket's recorded holder before accepting a transfer confirmation
