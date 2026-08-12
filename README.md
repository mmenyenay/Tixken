# Tixken

Tokenized event tickets built on Brickken sandbox infrastructure. A host creates
an event, ticket tokens get minted and whitelisted, attendees scan a QR code to
enter, and an autonomous agent under a RAMS mandate reclaims anything unused
once the event closes, either burning it or converting it into a credit for
the next event.

Built for the Build with Brickken Challenge, API and Agentic tracks.

## What it does

- Host tokenizes an event and mints one ticket token per attendee
- Each ticket comes with a QR code, scanned at the door to confirm entry
- Tickets can be transferred or resold, capped at a price set by the host
- Telegram and email fire on new events, entry confirmations, and reclaims
- A leaderboard ranks attendees by events attended
- Once the event deadline passes, an ERC-8004 agent holding a RAMS mandate
  automatically reclaims any ticket that was never scanned, either burning it
    or converting it into a loyalty credit, depending on how the host configured
      the event

      ## Surfaces used

      This project uses two of Brickken's developer surfaces.

      **REST**, against the Dapp API (`https://api.sandbox.brickken.com`), for the
      ticketing side. Methods called through `POST /prepare-transactions` and
      `POST /send-transactions`:

      - `newTokenization`, to create the ticket token for an event
      - `whitelist`, to approve an attendee wallet before it can hold a ticket
      - `mintToken`, to issue a ticket
      - `burnToken`, to close out a scanned ticket or reclaim an unused one
      - `transferFrom`, to move an unused ticket back to the organizer wallet
        when the event's reclaim mode is set to credit

        Read calls used: `GET /get-transaction-status`, `GET /get-whitelist-status`,
        `GET /get-token-info`.

        **MCP**, against the hosted Brickken MCP server
        (`https://mcp.brickken.com/mcp`), for the agentic reclaim side:

        - `agent_register`, to give the reclaim agent an ERC-8004 identity
        - `rams_grant_mandate` and `rams_set_executor_action`, to scope what the
          agent is allowed to do and cap how often it can act
          - `rams_can_execute`, checked before every reclaim run
          - `rams_execute`, to perform the reclaim under the mandate

          ## Why two surfaces

          The ticket lifecycle, tokenize, whitelist, mint, burn, is a straightforward
          API-key workflow, so it runs on REST. The reclaim decision is different, it
          is an autonomous action taken without a human clicking a button, so it needed
          delegated, auditable authority rather than a raw API key. RAMS mandates exist
          for exactly that, which is why the reclaim job runs through MCP against the
          Agentic API instead.

          ## How the reclaim decision works

          The host sets a reclaim mode per event at creation time, burn or credit. The
          agent never decides this itself, it only enforces whatever the host already
          configured. This keeps the autonomous part of the system auditable: the
          agent's authority is scoped to one action, capped in frequency by the
          mandate, and every run is checked against `rams_can_execute` before anything
          happens on chain.

          ## Running it

          1. Clone the repo and run `npm install`
          2. Copy `.env.example` to `.env` and fill in your sandbox API key, signer
             wallet, agent wallet, and notification credentials
             3. Run `npm start`
             4. Create an event: `POST /api/events`
             5. Issue a ticket: `POST /api/tickets`
             6. Scan a ticket at the door: `POST /api/scan`
             7. Check the leaderboard: `GET /api/leaderboard`
             8. The reclaim job runs automatically every hour once an event's `endsAt`
                time has passed, or trigger it manually with `node src/agent/reclaimJob.js`

                Full request bodies for each endpoint are in the route files under
                `src/routes/`.

                ## Tech stack

                Node.js, Express, ethers for local transaction signing, the Brickken Dapp API
                over REST, the Brickken hosted MCP server for the agentic side, qrcode for
                ticket QR generation, node-telegram-bot-api and nodemailer for
                notifications, node-cron for the scheduled reclaim job, lowdb as a small
                local store for the hackathon build.

                ## AI tools disclosure

                Parts of this project's scaffolding, including the initial route structure
                and the MCP client wiring, were drafted with AI assistance and then reviewed
                and adapted by the developer. All Brickken sandbox calls were built against
                the live API and MCP documentation and tested against the sandbox
                environment directly.

                ## What is not built yet

                - Frontend for organizers to create events and for attendees to view their
                  QR code and scan at the door
                  - Resale price cap enforcement through the RAMS mandate
                  - Automated tests against the sandbox