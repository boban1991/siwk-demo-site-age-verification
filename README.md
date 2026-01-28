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

The site is set up with Klarna age verification integration. The backend API endpoints are ready in `server.js`:

- `GET /api/klarna/config` - Returns public Klarna configuration
- `POST /api/klarna/verify` - Initiates Klarna age verification
- `GET /api/klarna/callback` - Handles Klarna verification callback

### Next Steps to Complete Integration

1. **Add your Klarna credentials** (see Environment Variables section above)
2. **Update the API implementation** in `server.js`:
   - Replace the placeholder code in `/api/klarna/verify` with actual Klarna API calls
   - Update `/api/klarna/callback` to verify the session with Klarna
   - Use the Klarna API documentation for the exact endpoints and request/response formats

3. **Test the integration**:
   - Use sandbox credentials first
   - Test the full verification flow
   - Verify the callback handling works correctly

The frontend is already configured to call these API endpoints. Once you add your credentials and complete the API implementation, the integration will be fully functional.

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

### Setting Up Klarna Credentials in Vercel

To add your Klarna API credentials to your Vercel deployment:

1. **Go to your Vercel Dashboard**
   - Visit [vercel.com](https://vercel.com) and sign in
   - Select your project (siwk-demo-site-age-verification)

2. **Navigate to Settings**
   - Click on your project
   - Go to the **Settings** tab
   - Click on **Environment Variables** in the left sidebar

3. **Add Environment Variables**
   Add the following variables:

   | Variable Name | Value | Environment |
   |--------------|-------|-------------|
   | `KLARNA_USER_NAME` | Your Klarna Username (Client ID) | Production, Preview, Development |
   | `KLARNA_PASSWORD` | Your Klarna API Key (Client Secret) | Production, Preview, Development |
   | `KLARNA_BASE_URL` | `https://api-global.test.klarna.com` (test) or `https://api-global.klarna.com` (prod) | Production, Preview, Development |
   | `KLARNA_ACCOUNT_ID` | Your Klarna Account ID (e.g., `krn:partner:global:account:test:MI5RSLGHURL`) | Production, Preview, Development |
   | `KLARNA_RETURN_URL` | Your callback URL (e.g., `https://your-site.vercel.app`) | Production, Preview, Development |
   | `KLARNA_CUSTOMER_REGION` | (Optional) Customer region KRN (default: `krn:partner:eu1:region`) | Production, Preview, Development |

4. **For Each Variable:**
   - Click **Add New**
   - Enter the variable name
   - Enter the value
   - Select which environments to apply it to (Production, Preview, Development)
   - Click **Save**

5. **Redeploy**
   - After adding the variables, go to the **Deployments** tab
   - Click the three dots (⋯) on your latest deployment
   - Click **Redeploy** to apply the new environment variables

### Local Development Setup

For local development, create a `.env` file in the root directory:

```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your credentials
KLARNA_USER_NAME=your_klarna_username_here
KLARNA_PASSWORD=your_klarna_api_key_here
KLARNA_BASE_URL=https://api-global.test.klarna.com
KLARNA_ACCOUNT_ID=krn:partner:global:account:test:YOUR_ACCOUNT_ID
KLARNA_RETURN_URL=http://localhost:3000
KLARNA_CUSTOMER_REGION=krn:partner:eu1:region
```

**Note:** The `.env` file is already in `.gitignore` and will not be committed to git.

### Getting Klarna Credentials

1. Sign up for a Klarna Partner account at [Klarna Partner Portal](https://www.klarna.com/partners/)
2. Navigate to the Developer/API section
3. Create a new application
4. Copy your Username (Client ID) and API Key (Client Secret)
5. Get your Account ID from the Klarna dashboard
6. Use the sandbox environment (`https://api-global.test.klarna.com`) for testing

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
