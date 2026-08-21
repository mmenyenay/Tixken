# Tixken

### Onchain tickets that can be minted, verified, used, resold, and reclaimed.

Tixken turns event tickets into onchain assets using Brickken.

Instead of giving someone a ticket that can simply be screenshotted, Tixken creates a ticket token that can be minted to a specific wallet, verified at the door, burned after entry, and transferred under a host-defined resale cap.

Unused tickets can also be handled according to rules chosen by the event host, either burned or converted into credit.

The goal is simple:

**Create → Mint → Verify → Enter → Resell → Reclaim**

## Demo

🎥 **Demo video:**
https://youtu.be/9_clzTAUY5U

🌐 **Live application:**
https://tixken-production.up.railway.app

💻 **Repository:**
https://github.com/mmenyenay/Tixken

---

# Why Tixken?

Traditional event tickets have a few obvious problems.

They can be copied or screenshotted, resale prices can become unreasonable, and an unused ticket normally becomes worthless after the event.

Tixken treats the ticket as an onchain asset instead.

That gives the ticket a verifiable identity and allows its lifecycle to continue beyond simply getting someone through the door.

A ticket can be:

* Created as part of a tokenized event
* Whitelisted to an attendee
* Minted to a wallet
* Verified at the entrance
* Burned after use
* Resold under a host-defined price cap
* Reclaimed after the event according to the host's chosen policy

---

# How it works

## 1. Host creates an event

The host enters the event details, chooses a token symbol, and selects what should happen to tickets that are never used.

The available reclaim policies are:

* Burn unused tickets
* Convert unused tickets into credit

Tixken sends the tokenization request to Brickken's sandbox.

This is a real Brickken API integration, not a simulated token creation.

## 2. Attendee receives a ticket

The attendee provides the event ID, wallet address, and email.

Tixken handles the Brickken whitelist and mint flow.

The resulting ticket contains a QR code connected to the specific ticket token.

## 3. Ticket is verified at the door

The attendee presents the ticket at the entrance.

Tixken checks the ticket and burns the token after successful entry.

This prevents the same ticket from being used again.

A successful Sepolia burn transaction is included in the verification section below.

## 4. Ticket resale

If an attendee cannot attend the event, the ticket can be listed for resale.

The host defines the maximum resale price.

The seller signs the transfer with their own wallet, and the ticket is transferred directly to the buyer.

Tixken does not take custody of the ticket.

## 5. Agentic reclaim

Tixken also includes an agentic reclaim system.

The reclaim agent has an onchain identity registered through Brickken's Agentic API.

The host's selected reclaim policy determines whether an unused ticket should be burned or converted into credit.

The RAMS mandate is configured with scoped actions for these operations.

The mandate setup is confirmed onchain. Final end-to-end delegated execution testing is still being completed, so this README does not claim that the full autonomous RAMS execution is already proven live.

---

# Brickken integration

Brickken is part of the actual application flow.

Tixken uses the Brickken sandbox REST APIs for both the ticket lifecycle and the agentic infrastructure.

## Dapp REST API

### Write methods

* `newTokenization`
* `whitelist`
* `mintToken`
* `burnToken`
* `transferTo`
* `approve`

### Read/status methods

* `get-transaction-status`
* `get-whitelist-status`
* `get-token-info`

## Agentic REST API

Tixken uses Brickken's Agentic REST API for:

* ERC-8004 agent registration
* RAMS executor action configuration
* Delegated `ramsExecute` execution

The agentic layer is designed so that the reclaim agent follows the policy selected by the event host rather than inventing its own rules.

---

# Brickken surfaces used

**REST API — Dapp**

Used for:

* Event tokenization
* Whitelisting
* Ticket minting
* Ticket burning
* Ticket transfers
* Token approval
* Transaction status
* Whitelist status
* Token information

**REST API — Agentic**

Used for:

* Agent registration
* RAMS executor action configuration
* RAMS execution

**MCP:** Not used directly.

**CLI:** Not used directly.

**Skill:** Not used directly.

---

# Network

**Ethereum Sepolia**

**Chain ID:** `11155111`

**Hex chain ID:** `0xaa36a7`

All blockchain transactions referenced by this project are testnet transactions.

---

# Transaction evidence

Brickken's campaign requires transaction hashes produced by the build so that usage can be independently verified.

## Confirmed Tixken transactions

### Door Scan / ticket burn

**Transaction hash:**

`0xa7aae391226d06afd31090b93ce12b302a50debc808a69014ee372076833d43c`

This transaction successfully burned 1 `FOUND` token by transferring it to the zero address on Ethereum Sepolia.

**Explorer:**

https://sepolia.etherscan.io/tx/0xa7aae391226d06afd31090b93ce12b302a50debc808a69014ee372076833d43c

### Additional confirmed ticket burn

**Transaction hash:**

`0xc0c3c75940155bfb0f267e911b20fc0839dc5005ff669c2467d91a9d430c4d70`

This transaction successfully burned 1 `TVD` token by transferring it to the zero address.

**Explorer:**

https://sepolia.etherscan.io/tx/0xc0c3c75940155bfb0f267e911b20fc0839dc5005ff669c2467d91a9d430c4d70

### Confirmed token transfer

**Transaction hash:**

`0xab4cadd943e7d3f8d95df89fd9cdfed247fa910f2ef50f5cb9b27dd3a280f3e9`

This transaction successfully transferred 1 `CWDS` token from the project wallet to another wallet.

**Explorer:**

https://sepolia.etherscan.io/tx/0xab4cadd943e7d3f8d95df89fd9cdfed247fa910f2ef50f5cb9b27dd3a280f3e9

### Confirmed token transfer

**Transaction hash:**

`0x201b26e7c0da1cecbf0c97fa08ce99e0c81d01a5831e21823473750e5a96d49f`

This transaction successfully transferred 1 `DSP` token from the project wallet to another wallet.

**Explorer:**

https://sepolia.etherscan.io/tx/0x201b26e7c0da1cecbf0c97fa08ce99e0c81d01a5831e21823473750e5a96d49f

### RAMS executor approval

**Transaction hash:**

`0x832c841812b847493dc3b16900185be3a9aec8ae661d0fb7c54d7f154631c7e3`

---

# Reward wallet

**EVM wallet address:**

`0x14aDeE838FD37Db2F10187efA3D48a4b2840665C`

---

# Security

Tixken follows the Brickken campaign security requirements.

* Brickken API keys are kept outside source control.
* Secrets are supplied through environment variables.
* No private keys or seed phrases are sent to Brickken.
* Transactions are signed by the user's wallet.
* Chain ID, wallet addresses, token addresses, and recipients are checked before signing.
* The project uses Brickken sandbox infrastructure and testnet assets.

---

# AI disclosure

AI tools were used during development for brainstorming, debugging, code review, and documentation assistance.

The project author made the architectural decisions, implemented and integrated the application, performed the Brickken integration, tested the transaction flows, investigated errors, and verified the working flows demonstrated in the application.

AI was used as a development aid and not as a substitute for the developer's implementation and testing work.

---

# Current limitations

Tixken is a working prototype and is intentionally transparent about what is and is not complete.

### Confirmed working

* Event tokenization flow
* Ticket whitelisting
* Ticket minting
* Ticket QR generation
* Door verification
* Ticket burn after entry
* Resale listing
* Ticket transfer
* Host-defined resale cap
* Brickken Agentic API integration
* RAMS mandate configuration

### Still being finalized

* End-to-end autonomous RAMS delegated reclaim execution

The reclaim logic itself is implemented and tested against the sandbox. The final delegated execution path is being completed and is not represented as fully live until it is independently confirmed.

---

# Built for Build with Brickken

Tixken was created for the **Build with Brickken** campaign.

The project uses Brickken infrastructure as a core part of the product rather than simply using blockchain as a database.

The ticket is the asset.

The event host defines the rules.

The wallet controls ownership.

And the onchain lifecycle gives the ticket utility before, during, and after the event.
