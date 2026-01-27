# LuckyBet Casino - Online Gambling Platform

A professional online gambling website with integrated Klarna age verification. Users must verify their age (18+) before accessing the gambling content.

## Features

- 🎰 Professional gambling site UI with modern design
- 🔒 Age verification modal that blocks access until verified
- ✅ Klarna integration for secure age verification (SIWK)
- 📱 Fully responsive design
- 🎮 Game previews and promotions sections
- 💾 Verification status persistence (24-hour expiry)

## Setup

```bash
npm install
npm start
```

The site will be available at `http://localhost:3000`

## Development

```bash
npm run dev
```

## Klarna Age Verification Integration

The site includes a placeholder for Klarna Sign in with Klarna (SIWK) age verification. To complete the integration:

1. Obtain Klarna API credentials
2. Update the `initiateRealKlarnaVerification()` function in `src/scripts/main.js`
3. Implement the Klarna SDK initialization and verification flow
4. Handle the verification callback

Currently, the site uses a simulated verification flow for demonstration purposes.

## Deployment to Vercel

### Option 1: Using Vercel CLI

```bash
# Install Vercel CLI globally
npm i -g vercel

# Deploy
vercel

# For production
vercel --prod
```

### Option 2: Using GitHub Integration

1. Push your code to a GitHub repository
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your GitHub repository
5. Vercel will automatically detect the configuration and deploy

### Option 3: Using Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Upload your project folder
4. Vercel will automatically configure and deploy

The `vercel.json` file is already configured for Node.js/Express deployment.

## Project Structure

```
.
├── src/
│   ├── index.html          # Main HTML file
│   ├── styles/
│   │   └── main.css        # All styles
│   └── scripts/
│       └── main.js         # Age verification & site logic
├── server.js               # Express server
├── package.json
├── vercel.json            # Vercel deployment config
└── README.md
```

## Environment Variables

For production, you may want to set these environment variables in Vercel:

- `NODE_ENV=production`
- `KLARNA_CLIENT_ID` (when implementing real Klarna integration)
- `KLARNA_CLIENT_SECRET` (when implementing real Klarna integration)

## Age Verification Flow

1. User visits the site
2. Age verification modal appears (blocks all content)
3. User can verify via:
   - **Klarna**: One-click secure verification
   - **Manual**: Enter date of birth
4. Upon successful verification, main site content is revealed
5. Verification status is stored in localStorage (expires after 24 hours)

## License

MIT

## Responsible Gaming

This is a demo site. In production, ensure compliance with:
- Local gambling regulations
- Age verification requirements
- Responsible gaming practices
- Data protection laws (GDPR, etc.)
