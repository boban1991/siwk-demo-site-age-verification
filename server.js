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
  clientId: process.env.KLARNA_USER_NAME || process.env.KLARNA_CLIENT_ID, // Username/Client ID
  clientSecret: process.env.KLARNA_PASSWORD || process.env.KLARNA_CLIENT_SECRET, // API key/Password
  apiKey: process.env.KLARNA_PASSWORD || process.env.KLARNA_API_KEY || process.env.KLARNA_CLIENT_SECRET, // API key (password)
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
    clientId: KLARNA_CONFIG.clientId, // Username
    environment: KLARNA_CONFIG.environment,
    // Don't expose API key/password
  });
});

// API endpoint to create Klarna Identity Request
app.post('/api/klarna/identity/request', async (req, res) => {
  try {
    console.log('Creating identity request...');
    console.log('Config check:', {
      hasUserName: !!KLARNA_CONFIG.clientId,
      hasPassword: !!KLARNA_CONFIG.clientSecret,
      hasApiKey: !!KLARNA_CONFIG.apiKey,
      userNamePrefix: KLARNA_CONFIG.clientId ? KLARNA_CONFIG.clientId.substring(0, 10) + '...' : 'missing',
      passwordPrefix: KLARNA_CONFIG.clientSecret ? KLARNA_CONFIG.clientSecret.substring(0, 10) + '...' : 'missing',
      hasAccountId: !!KLARNA_CONFIG.accountId,
      apiUrl: KLARNA_CONFIG.apiUrl,
      accountId: KLARNA_CONFIG.accountId
    });
    
    if (!KLARNA_CONFIG.apiKey || !KLARNA_CONFIG.accountId) {
      console.error('Missing credentials');
      return res.status(500).json({ 
        error: 'Klarna credentials not configured. Please set KLARNA_PASSWORD (API key) and KLARNA_ACCOUNT_ID environment variables.' 
      });
    }

    // Generate idempotency key (UUID v4)
    const idempotencyKey = crypto.randomUUID();
    
    // Use account ID - try both full KRN and extracted format
    // KRN format: krn:partner:global:account:test:MI5RSLGHURL
    let accountId = KLARNA_CONFIG.accountId;
    let accountIdExtracted = accountId;
    
    if (accountId && accountId.startsWith('krn:')) {
      // Extract the last part after the last colon
      const parts = accountId.split(':');
      accountIdExtracted = parts[parts.length - 1];
      console.log('Full KRN:', accountId);
      console.log('Extracted account ID:', accountIdExtracted);
    }
    
    // Try with extracted account ID first (most common)
    // If that fails, we can try with full KRN (URL encoded)
    accountId = accountIdExtracted;
    
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

    const apiUrl = `${KLARNA_CONFIG.apiUrl}/v2/accounts/${accountId}/identity/requests`;
    console.log('Making request to:', apiUrl);
    console.log('Request body:', JSON.stringify(identityRequest, null, 2));

    // Klarna Identity API authentication
    // Identity API uses API key authentication (not OAuth)
    // The API key is KLARNA_PASSWORD (the test API key from Klarna)
    const apiKey = KLARNA_CONFIG.apiKey;
    
    if (!apiKey) {
      throw new Error('API key (KLARNA_PASSWORD) is required');
    }
    
    // Basic Auth with API key only
    // Format: Basic <base64(apiKey:)>
    const authHeader = `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`;
    console.log('Using API key authentication (Basic Auth with apiKey:)');
    console.log('API key length:', apiKey.length);
    console.log('API key starts with:', apiKey.substring(0, 15) + '...');

    // Make API call to create identity request
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Klarna-Idempotency-Key': idempotencyKey,
        'Partner-Correlation-Id': `partner-${Date.now()}`
      },
      body: JSON.stringify(identityRequest)
    });
    
    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Klarna API error:', response.status, errorText);
      console.error('Request URL:', apiUrl);
      console.error('Account ID used:', accountId);
      console.error('Auth method:', KLARNA_CONFIG.clientId ? 'clientId:apiKey' : 'apiKey only');
      console.error('Client ID (first 10 chars):', KLARNA_CONFIG.clientId ? KLARNA_CONFIG.clientId.substring(0, 10) + '...' : 'missing');
      console.error('API Key (first 10 chars):', apiKey ? apiKey.substring(0, 10) + '...' : 'missing');
      
      // Try to parse error response
      let errorDetails = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        errorDetails = JSON.stringify(errorJson, null, 2);
        console.error('Parsed error:', errorDetails);
      } catch (e) {
        // Not JSON, use as-is
      }
      
      // If 401, the API key is likely incorrect
      // Log detailed info to help debug
      if (response.status === 401) {
        console.error('401 Unauthorized - API key authentication failed');
        console.error('This usually means:');
        console.error('1. The API key (KLARNA_CLIENT_SECRET) is incorrect');
        console.error('2. The API key doesn\'t match the test environment');
        console.error('3. The API key format is wrong');
        console.error('4. The account ID doesn\'t match the API key');
      }
      
      return res.status(response.status).json({ 
        error: `Klarna API error: ${response.status}`,
        details: errorDetails,
        accountIdUsed: accountId,
        apiUrl: apiUrl,
        authMethod: KLARNA_CONFIG.clientId ? 'clientId:apiKey' : 'apiKey only',
        hint: response.status === 401 ? 'API key authentication failed. Verify: 1) KLARNA_PASSWORD (your test API key) is correct in Vercel, 2) It matches the test/sandbox environment, 3) The API key has access to the Identity API, 4) Account ID matches the API key' : undefined
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
app.get('/api/klarna/identity/request/:identityRequestId', async (req, res) => {
  try {
    const { identityRequestId } = req.params;
    
    if (!KLARNA_CONFIG.apiKey || !KLARNA_CONFIG.accountId) {
      return res.status(500).json({ 
        error: 'Klarna credentials not configured. Please set KLARNA_PASSWORD and KLARNA_ACCOUNT_ID'
      });
    }

    // Extract account ID from KRN format if needed
    let accountId = KLARNA_CONFIG.accountId;
    if (accountId && accountId.startsWith('krn:')) {
      const parts = accountId.split(':');
      accountId = parts[parts.length - 1];
    }

    // Use same auth method as create request (API key only)
    const apiKey = KLARNA_CONFIG.apiKey;
    if (!apiKey) {
      return res.status(500).json({ error: 'API key (KLARNA_PASSWORD) is required' });
    }
    const authHeader = `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`;
    console.log('Reading identity request with API key auth');

    const response = await fetch(
      `${KLARNA_CONFIG.apiUrl}/v2/accounts/${accountId}/identity/requests/${identityRequestId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
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
