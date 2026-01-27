const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'src')));

// Klarna API Configuration (from environment variables)
const KLARNA_CONFIG = {
  clientId: process.env.KLARNA_CLIENT_ID,
  clientSecret: process.env.KLARNA_CLIENT_SECRET,
  environment: process.env.KLARNA_ENVIRONMENT || 'sandbox', // 'sandbox' or 'production'
  apiUrl: process.env.KLARNA_BASE_URL || 'https://api-global.test.klarna.com',
  accountId: process.env.KLARNA_ACCOUNT_ID,
  returnUrl: process.env.KLARNA_RETURN_URL || process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : 'https://siwk-kn-demo.vercel.app'
};

// Route for the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'index.html'));
});

// API endpoint to get Klarna configuration (public config only)
app.get('/api/klarna/config', (req, res) => {
  res.json({
    clientId: KLARNA_CONFIG.clientId,
    environment: KLARNA_CONFIG.environment,
    // Don't expose client secret
  });
});

// API endpoint to initiate Klarna age verification
app.post('/api/klarna/verify', async (req, res) => {
  try {
    // TODO: Implement actual Klarna API call here
    // This is a placeholder for the Klarna age verification flow
    
    if (!KLARNA_CONFIG.clientId || !KLARNA_CONFIG.clientSecret) {
      return res.status(500).json({ 
        error: 'Klarna credentials not configured. Please set KLARNA_CLIENT_ID and KLARNA_CLIENT_SECRET environment variables.' 
      });
    }

    // Example Klarna API call structure:
    /*
    const response = await fetch(`${KLARNA_CONFIG.apiUrl}/age-verification/v1/sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${KLARNA_CONFIG.clientId}:${KLARNA_CONFIG.clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/json',
        'Klarna-Account-Id': KLARNA_CONFIG.accountId, // If required by API
      },
      body: JSON.stringify({
        redirect_uri: `${KLARNA_CONFIG.returnUrl}/api/klarna/callback`,
        account_id: KLARNA_CONFIG.accountId,
        // Add other required parameters
      })
    });
    
    const data = await response.json();
    return res.json(data);
    */

    // For now, return a mock response
    // TODO: Replace with actual Klarna API call that returns a verification URL
    // Don't return success: true here - only return success after actual verification
    res.json({
      initiated: true,
      message: 'Klarna verification initiated',
      // In real implementation, return the verification URL or session ID
      verificationUrl: null, // This would be the URL to redirect to for actual verification
      sessionId: null, // This would be the session ID
      // Note: Don't set verification status until user completes the flow
    });
  } catch (error) {
    console.error('Klarna verification error:', error);
    res.status(500).json({ error: 'Failed to initiate Klarna verification' });
  }
});

// API endpoint for Klarna callback (after user completes verification)
// This serves the callback.html page that the Klarna SDK expects
app.get('/api/klarna/callback', async (req, res) => {
  try {
    // Serve a callback page that the Klarna SDK can use
    // The SDK will handle the OAuth flow and emit events
    const callbackHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Klarna Verification Callback</title>
    <script defer src="https://js.klarna.com/web-sdk/v1/klarna.js"></script>
</head>
<body>
    <div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif;">
        <p>Completing verification...</p>
    </div>
    <script>
        window.KlarnaSDKCallback = async function(klarna) {
            try {
                const configResponse = await fetch('/api/klarna/config');
                const config = await configResponse.json();
                
                await klarna.init({
                    clientId: config.clientId
                });
                
                // Listen for signin event
                klarna.Identity.on('signin', async (signinResponse) => {
                    // Redirect back to main page with success
                    window.location.href = '/?verified=true';
                });
                
                // Listen for errors
                klarna.Identity.on('error', async (error) => {
                    console.error('Klarna error:', error);
                    window.location.href = '/?verified=false';
                });
            } catch (error) {
                console.error('Callback error:', error);
                window.location.href = '/?verified=false';
            }
        };
    </script>
</body>
</html>
    `;
    res.send(callbackHtml);
  } catch (error) {
    console.error('Klarna callback error:', error);
    res.redirect('/?verified=false');
  }
});

// Export the app for Vercel serverless functions
module.exports = app;

// For local development, start the server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Klarna Environment: ${KLARNA_CONFIG.environment}`);
    console.log(`Klarna Client ID: ${KLARNA_CONFIG.clientId ? '✓ Configured' : '✗ Not configured'}`);
  });
}
