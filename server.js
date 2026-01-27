const express = require('express');
const path = require('path');
const crypto = require('crypto');

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

// API endpoint to create Klarna Identity Request
app.post('/api/klarna/identity/request', async (req, res) => {
  try {
    if (!KLARNA_CONFIG.clientId || !KLARNA_CONFIG.clientSecret || !KLARNA_CONFIG.accountId) {
      return res.status(500).json({ 
        error: 'Klarna credentials not configured. Please set KLARNA_CLIENT_ID, KLARNA_CLIENT_SECRET, and KLARNA_ACCOUNT_ID environment variables.' 
      });
    }

    // Generate idempotency key (UUID v4)
    const idempotencyKey = crypto.randomUUID();
    
    // Create identity request with all available scopes
    const identityRequest = {
      request_customer_token: {
        scopes: [
          'customer:login',
          'profile:verified:name',
          'profile:verified:date_of_birth',
          'profile:email',
          'profile:phone',
          'profile:locale',
          'profile:billing_address',
          'profile:country',
          'profile:customer_id'
        ]
      },
      customer_interaction_config: {
        method: 'HANDOVER',
        return_url: `${KLARNA_CONFIG.returnUrl}/api/klarna/callback?identity_request_id={klarna.identity_request.id}&state={klarna.identity_request.state}`
      }
    };

    // Make API call to create identity request
    const response = await fetch(
      `${KLARNA_CONFIG.apiUrl}/v2/accounts/${KLARNA_CONFIG.accountId}/identity/requests`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${KLARNA_CONFIG.clientId}:${KLARNA_CONFIG.clientSecret}`).toString('base64')}`,
          'Content-Type': 'application/json',
          'Klarna-Idempotency-Key': idempotencyKey,
          'Partner-Correlation-Id': `partner-${Date.now()}`
        },
        body: JSON.stringify(identityRequest)
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Klarna API error:', response.status, errorText);
      return res.status(response.status).json({ 
        error: `Klarna API error: ${response.status}`,
        details: errorText
      });
    }

    const data = await response.json();
    
    // Extract the identity request URL from state_context
    const identityRequestUrl = data.state_context?.customer_interaction?.identity_request_url;
    
    if (!identityRequestUrl) {
      return res.status(500).json({ 
        error: 'Identity request URL not found in response',
        response: data
      });
    }

    res.json({
      identity_request_id: data.identity_request_id,
      identity_request_url: identityRequestUrl,
      state: data.state
    });
  } catch (error) {
    console.error('Klarna identity request error:', error);
    res.status(500).json({ error: 'Failed to create identity request', details: error.message });
  }
});

// API endpoint to read identity request state
app.get('/api/klarna/identity/request/:identityRequestId', async (req, res) => {
  try {
    const { identityRequestId } = req.params;
    
    if (!KLARNA_CONFIG.clientId || !KLARNA_CONFIG.clientSecret || !KLARNA_CONFIG.accountId) {
      return res.status(500).json({ 
        error: 'Klarna credentials not configured' 
      });
    }

    const response = await fetch(
      `${KLARNA_CONFIG.apiUrl}/v2/accounts/${KLARNA_CONFIG.accountId}/identity/requests/${identityRequestId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${KLARNA_CONFIG.clientId}:${KLARNA_CONFIG.clientSecret}`).toString('base64')}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Klarna API error:', response.status, errorText);
      return res.status(response.status).json({ 
        error: `Klarna API error: ${response.status}`,
        details: errorText
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Klarna identity request read error:', error);
    res.status(500).json({ error: 'Failed to read identity request', details: error.message });
  }
});

// API endpoint for Klarna callback (after user completes identity flow)
app.get('/api/klarna/callback', async (req, res) => {
  try {
    const { identity_request_id, state } = req.query;
    
    if (!identity_request_id) {
      return res.status(400).json({ error: 'Missing identity_request_id' });
    }

    // Redirect to success page with identity request ID
    // The frontend will fetch the identity request data
    res.redirect(`/?identity_request_id=${identity_request_id}&state=${state || 'completed'}`);
  } catch (error) {
    console.error('Klarna callback error:', error);
    res.redirect('/?error=callback_failed');
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
