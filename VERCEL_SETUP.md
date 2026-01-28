# Quick Guide: Adding Klarna Credentials to Vercel

## Step-by-Step Instructions

### 1. Access Vercel Dashboard
- Go to [vercel.com](https://vercel.com) and sign in
- Click on your project: **siwk-demo-site-age-verification**

### 2. Navigate to Environment Variables
- Click on the **Settings** tab (top navigation)
- Click on **Environment Variables** (left sidebar)

### 3. Add Your Credentials

Click **Add New** for each variable:

#### Variable 1: KLARNA_CLIENT_ID
- **Key:** `KLARNA_CLIENT_ID`
- **Value:** Your Klarna Client ID (from Klarna Partner Portal)
- **Environments:** ✅ Production, ✅ Preview, ✅ Development
- Click **Save**

#### Variable 2: KLARNA_CLIENT_SECRET
- **Key:** `KLARNA_CLIENT_SECRET`
- **Value:** Your Klarna Client Secret (from Klarna Partner Portal)
- **Environments:** ✅ Production, ✅ Preview, ✅ Development
- Click **Save**

#### Variable 3: KLARNA_ENVIRONMENT
- **Key:** `KLARNA_ENVIRONMENT`
- **Value:** `sandbox` (for testing) or `production` (for live)
- **Environments:** ✅ Production, ✅ Preview, ✅ Development
- Click **Save**

#### Variable 4: KLARNA_BASE_URL
- **Key:** `KLARNA_BASE_URL`
- **Value:** `https://api-global.test.klarna.com`
- **Environments:** ✅ Production, ✅ Preview, ✅ Development
- Click **Save**

#### Variable 5: KLARNA_ACCOUNT_ID
- **Key:** `KLARNA_ACCOUNT_ID`
- **Value:** `krn:partner:global:account:test:MI5RSLGHURL`
- **Environments:** ✅ Production, ✅ Preview, ✅ Development
- Click **Save**

#### Variable 6: KLARNA_RETURN_URL
- **Key:** `KLARNA_RETURN_URL`
- **Value:** `https://siwk-kn-demo.vercel.app` (your Vercel deployment URL)
- **Environments:** ✅ Production, ✅ Preview, ✅ Development
- Click **Save**

#### Variable 7 (optional): KLARNA_CUSTOMER_REGION
- **Key:** `KLARNA_CUSTOMER_REGION`
- **Value:** `krn:partner:eu1:region` (or your region KRN from Klarna)
- **Environments:** ✅ Production, ✅ Preview, ✅ Development
- **Note:** All Klarna API requests include the header `X-Klarna-Customer-Region`. Default is `krn:partner:eu1:region`. Override only if your account uses a different region.
- Click **Save**

### 4. Redeploy Your Application

After adding all variables:

1. Go to the **Deployments** tab
2. Find your latest deployment
3. Click the three dots (⋯) menu
4. Click **Redeploy**
5. Confirm the redeploy

Your new environment variables will be available in the next deployment!

## Verification

After redeploying, check the deployment logs to confirm:
- The server should log: `Klarna Client ID: ✓ Configured`
- No errors about missing credentials

## Getting Klarna Credentials

If you don't have Klarna credentials yet:

1. Visit [Klarna Partner Portal](https://www.klarna.com/partners/)
2. Sign up or log in
3. Navigate to Developer/API section
4. Create a new application
5. Copy your Client ID and Client Secret
6. Use **Sandbox** environment for testing

## Troubleshooting

**Credentials not working?**
- Make sure you clicked "Redeploy" after adding variables
- Check that all six variables are set
- Verify the values are correct (no extra spaces)
- Check deployment logs for error messages
- Make sure KLARNA_RETURN_URL matches your actual Vercel deployment URL

**Need to update credentials?**
- Go back to Settings → Environment Variables
- Click on the variable to edit
- Update the value and save
- Redeploy your application
