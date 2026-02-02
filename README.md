# Northside Pharmacy (Demo) – Age Verification with Klarna

A pharmacy e-commerce demo site with integrated Klarna age verification. Users can browse products, add items to the cart, and must verify their age (18+) when checking out with age-restricted products.

## Features

- 🏥 Pharmacy demo UI: products, cart, checkout
- 🔒 Age verification at checkout when the cart contains age-restricted products
- ✅ Klarna Sign in with Klarna (SIWK) for age verification – **test (playground)** and **production** flows
- 📱 Responsive layout
- 💾 Verification status and customer profile stored (24-hour expiry for verification)
- 📋 Success screen showing verified customer data (name, email, DOB, address)

## Setup

```bash
npm install
npm start
```

The site is available at `http://localhost:3000`.

## Development

```bash
npm run dev
```

## Klarna Age Verification Integration

The app uses the [Klarna Identity API](https://docs.klarna.com/conversion-boosters/sign-in-with-klarna/integrate-sign-in-with-klarna/klarna-identity-api/) (Sign in with Klarna) for age verification. There are two flows:

- **Playground (test)** – first “Continue with Klarna” button; uses test credentials and test Klarna environment.
- **Production** – second “Continue with Klarna” button (outline style with “Production” badge); uses production credentials and production Klarna environment.

### API Endpoints (in `server.js`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `POST /api/klarna/identity/request` | POST | Create identity request. Body: `{}` or `{ environment: 'test' }` for playground, `{ environment: 'production' }` for production. Returns `identity_request_url` to redirect the user to Klarna. |
| `GET /api/klarna/identity/request/:id` | GET | Read identity request state and customer data. Query: `?env=production` for production. |
| `GET /api/klarna/callback` | GET | Callback for **test** flow after Klarna redirect. |
| `GET /api/klarna/production/callback` | GET | Callback for **production** flow after Klarna redirect. |
| `GET /api/klarna/status` | GET | Debug: shows which envs have credentials configured (no secrets). |

### Age Verification Flow

1. User browses products and adds items to the cart (some products are age-restricted).
2. User clicks “Proceed to Checkout” in the cart.
3. If the cart contains age-restricted products and the user is not yet verified, the age verification modal is shown.
4. User clicks “Continue with Klarna” (playground or production). The app creates an identity request and redirects to Klarna.
5. After completing verification on Klarna, the user is redirected back to the site (callback), then to a success screen with verified customer data.
6. User can continue to checkout; verified profile data is shown on the checkout screen when available.

## Deployment to Vercel

### Option 1: Vercel CLI

```bash
npm i -g vercel
vercel
vercel --prod   # production
```

### Option 2: GitHub Integration

1. Push the repo to GitHub.
2. In [vercel.com](https://vercel.com), create a new project and import the repository.
3. Vercel will use the existing `vercel.json` (Node.js/Express).

## Project Structure

```
.
├── src/
│   ├── index.html          # Main HTML (pharmacy demo UI)
│   ├── styles/
│   │   └── main.css
│   └── scripts/
│       └── main.js         # Cart, checkout, age verification, Klarna flow
├── server.js               # Express server & Klarna Identity API
├── package.json
├── vercel.json             # Vercel rewrites to server.js
└── README.md
```

## Environment Variables

### Test (playground) flow

| Variable | Description |
|----------|-------------|
| `KLARNA_USER_NAME` | Klarna username (test) |
| `KLARNA_PASSWORD` | Klarna API key (test) |
| `KLARNA_ACCOUNT_ID` | Klarna account ID (test) |
| `KLARNA_BASE_URL` | Optional. Default: `https://api-global.test.klarna.com` |
| `KLARNA_RETURN_URL` | Base URL where Klarna redirects after verification (e.g. `https://your-app.vercel.app`). Must be `https://`. |
| `KLARNA_CUSTOMER_REGION` | Optional. Default: `krn:partner:eu1:region` |

### Production flow

| Variable | Description |
|----------|-------------|
| `KLARNA_PROD_USER_NAME` | Klarna username (production) |
| `KLARNA_PROD_PASSWORD` | Klarna API key (production) |
| `KLARNA_PROD_ACCOUNT_ID` | Klarna account ID (production) |
| `KLARNA_PROD_BASE_URL` | Optional. Default: `https://api-global.klarna.com` |
| `KLARNA_PROD_RETURN_URL` | Production base URL (e.g. `https://your-app.vercel.app`). Must be `https://`. |
| `KLARNA_PROD_CUSTOMER_REGION` | Optional. Default: `krn:partner:eu1:region` |

On Vercel, if `KLARNA_RETURN_URL` or `KLARNA_PROD_RETURN_URL` is not set, the app falls back to `VERCEL_URL` (current deployment URL). It is still recommended to set the return URLs explicitly.

### Local development

Create a `.env` file (see `.env.example`):

```bash
cp .env.example .env
# Edit .env with your test credentials
```

`.env` is in `.gitignore` and is not committed.

## Medication Safety & Age-Restricted Products

This is a demo. For a real pharmacy or age-gated site:

- Comply with local regulations for age-restricted products and medication.
- Use Klarna age verification (or equivalent) as required by your jurisdiction.
- Follow data protection rules (e.g. GDPR) when storing or using verified customer data.

## License

MIT
