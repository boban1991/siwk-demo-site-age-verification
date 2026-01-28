const express = require('express');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'src')));

// Klarna API Configuration (from environment variables)
// According to official docs: https://docs.klarna.com/conversion-boosters/sign-in-with-klarna/integrate-sign-in-with-klarna/klarna-identity-api/
// Authentication: Basic Auth with API key (authorization: klarna_api_key)
const KLARNA_CONFIG = {
  username: process.env.KLARNA_USER_NAME, // Username for Basic Auth
  apiKey: process.env.KLARNA_PASSWORD, // API key for Basic Auth
  apiUrl: process.env.KLARNA_BASE_URL || 'https://api-global.test.klarna.com',
  accountId: process.env.KLARNA_ACCOUNT_ID,
  returnUrl: process.env.KLARNA_RETURN_URL || (process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : 'https://siwk-kn-demo.vercel.app'),
  // Customer region header (required for some Klarna APIs, e.g. Identity)
  customerRegion: process.env.KLARNA_CUSTOMER_REGION || 'krn:partner:eu1:region'
};

// Get Basic Auth header for Klarna API
function getKlarnaAuthHeader() {
  if (!KLARNA_CONFIG.username || !KLARNA_CONFIG.apiKey) {
    throw new Error('KLARNA_USER_NAME and KLARNA_PASSWORD are required');
  }
  const credentials = Buffer.from(`${KLARNA_CONFIG.username}:${KLARNA_CONFIG.apiKey}`).toString('base64');
  return `Basic ${credentials}`;
}

// Common headers for all Klarna API requests (including X-Klarna-Customer-Region)
function getKlarnaRequestHeaders(extra = {}) {
  return {
    'Authorization': getKlarnaAuthHeader(),
    'Content-Type': 'application/json',
    'X-Klarna-Customer-Region': KLARNA_CONFIG.customerRegion,
    ...extra
  };
}

// Route for the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'index.html'));
});

// API endpoint to get Klarna configuration (public config only)
app.get('/api/klarna/config', (req, res) => {
  res.json({
    apiUrl: KLARNA_CONFIG.apiUrl,
    // Don't expose credentials
  });
});

// API endpoint to create Klarna Identity Request
// Documentation: https://docs.klarna.com/conversion-boosters/sign-in-with-klarna/integrate-sign-in-with-klarna/klarna-identity-api/
app.post('/api/klarna/identity/request', async (req, res) => {
  try {
    console.log('Creating identity request...');
    
    if (!KLARNA_CONFIG.username || !KLARNA_CONFIG.apiKey || !KLARNA_CONFIG.accountId) {
      console.error('Missing credentials');
      return res.status(500).json({ 
        error: 'Klarna credentials not configured. Please set KLARNA_USER_NAME, KLARNA_PASSWORD, and KLARNA_ACCOUNT_ID environment variables.' 
      });
    }

    // Generate idempotency key (UUID v4) - required header
    const idempotencyKey = crypto.randomUUID();
    
    // Extract account ID from KRN format if needed
    // KRN format: krn:partner:global:account:test:MI5RSLGHURL
    let accountId = KLARNA_CONFIG.accountId;
    if (accountId && accountId.startsWith('krn:')) {
      const parts = accountId.split(':');
      accountId = parts[parts.length - 1];
      console.log('Extracted account ID from KRN:', accountId);
    }
    
    // Create identity request according to official documentation
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

    const apiUrl = `${KLARNA_CONFIG.apiUrl}/v2/accounts/${accountId}/identity/requests`;
    console.log('Making request to:', apiUrl);
    console.log('Request body:', JSON.stringify(identityRequest, null, 2));

    console.log('Using Basic Auth with API key and X-Klarna-Customer-Region:', KLARNA_CONFIG.customerRegion);

    // Make API call to create identity request
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: getKlarnaRequestHeaders({
        'Klarna-Idempotency-Key': idempotencyKey,
        'Partner-Correlation-Id': `partner-${Date.now()}`
      }),
      body: JSON.stringify(identityRequest)
    });
    
    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Klarna API error:', response.status, errorText);
      console.error('Request URL:', apiUrl);
      console.error('Account ID used:', accountId);
      
      // Try to parse error response
      let errorDetails = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        errorDetails = JSON.stringify(errorJson, null, 2);
        console.error('Parsed error:', errorDetails);
      } catch (e) {
        // Not JSON, use as-is
      }
      
      if (response.status === 401) {
        console.error('401 Unauthorized - API key authentication failed');
        console.error('Verify: 1) KLARNA_USER_NAME and KLARNA_PASSWORD are correct, 2) They match the test environment, 3) Account ID is correct');
      }
      
      return res.status(response.status).json({ 
        error: `Klarna API error: ${response.status}`,
        details: errorDetails,
        accountIdUsed: accountId,
        apiUrl: apiUrl,
        hint: response.status === 401 ? 'Authentication failed. Verify KLARNA_USER_NAME, KLARNA_PASSWORD, and KLARNA_ACCOUNT_ID are correct and match the test environment.' : undefined
      });
    }

    const data = await response.json();
    console.log('Klarna API response:', JSON.stringify(data, null, 2));
    
    // Extract the identity request URL from state_context
    const identityRequestUrl = data.state_context?.customer_interaction?.identity_request_url;
    
    if (!identityRequestUrl) {
      console.error('Identity request URL not found. Full response:', data);
      return res.status(500).json({ 
        error: 'Identity request URL not found in response',
        response: data
      });
    }

    console.log('Identity request created successfully. URL:', identityRequestUrl);
    res.json({
      identity_request_id: data.identity_request_id,
      identity_request_url: identityRequestUrl,
      state: data.state
    });
  } catch (error) {
    console.error('Klarna identity request error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to create identity request', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// API endpoint to read identity request state
// Documentation: https://docs.klarna.com/conversion-boosters/sign-in-with-klarna/integrate-sign-in-with-klarna/klarna-identity-api/
app.get('/api/klarna/identity/request/:identityRequestId', async (req, res) => {
  try {
    const { identityRequestId } = req.params;
    
    if (!KLARNA_CONFIG.username || !KLARNA_CONFIG.apiKey || !KLARNA_CONFIG.accountId) {
      return res.status(500).json({ 
        error: 'Klarna credentials not configured. Please set KLARNA_USER_NAME, KLARNA_PASSWORD, and KLARNA_ACCOUNT_ID'
      });
    }

    // Extract account ID from KRN format if needed
    let accountId = KLARNA_CONFIG.accountId;
    if (accountId && accountId.startsWith('krn:')) {
      const parts = accountId.split(':');
      accountId = parts[parts.length - 1];
    }

    console.log('Reading identity request with Basic Auth and X-Klarna-Customer-Region:', KLARNA_CONFIG.customerRegion);

    const response = await fetch(
      `${KLARNA_CONFIG.apiUrl}/v2/accounts/${accountId}/identity/requests/${identityRequestId}`,
      {
        method: 'GET',
        headers: getKlarnaRequestHeaders()
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
    console.log(`Klarna API URL: ${KLARNA_CONFIG.apiUrl}`);
    console.log(`Klarna Username: ${KLARNA_CONFIG.username ? '✓ Configured' : '✗ Not configured'}`);
    console.log(`Klarna API Key: ${KLARNA_CONFIG.apiKey ? '✓ Configured' : '✗ Not configured'}`);
  });
}
