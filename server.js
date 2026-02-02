const express = require('express');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// API routes must be defined BEFORE static file serving
// This ensures /api/* routes are handled by Express, not static files

// Klarna Identity API Configuration (from environment variables)
// Docs: https://docs.klarna.com/conversion-boosters/sign-in-with-klarna/integrate-sign-in-with-klarna/klarna-identity-api/
// Base URLs per docs: Production https://api-global.klarna.com | Test https://api-global.test.klarna.com
// Auth: Basic Auth (username:api_key base64). Required headers: Klarna-Idempotency-Key, Content-Type.
// Template variables in return_url per docs: {klarna.identity_request.id}, {klarna.identity_request.state}
// On Vercel, VERCEL_URL is set (e.g. "app.vercel.app" or "xxx-git-branch-team.vercel.app") - use it when env-specific return URL is not set.
const DEFAULT_BASE_URL = 'https://siwk-demo-site-age-verification.vercel.app';

function getVercelBaseUrl() {
  const v = process.env.VERCEL_URL;
  if (!v || typeof v !== 'string') return DEFAULT_BASE_URL;
  return v.startsWith('http') ? v : `https://${v}`;
}

function buildReturnUrl(envVar, fallback) {
  const explicit = process.env[envVar];
  if (explicit && typeof explicit === 'string' && explicit.trim().length > 0) {
    const url = explicit.trim();
    return url.startsWith('http') ? url : `https://${url}`;
  }
  const base = getVercelBaseUrl();
  const url = (typeof fallback === 'string' && fallback) ? fallback : base;
  const final = url.startsWith('http') ? url : `https://${url}`;
  return final;
}

const KLARNA_CONFIG_TEST = {
  username: process.env.KLARNA_USER_NAME,
  apiKey: process.env.KLARNA_PASSWORD,
  apiUrl: (process.env.KLARNA_BASE_URL || 'https://api-global.test.klarna.com').replace(/\/$/, ''),
  accountId: process.env.KLARNA_ACCOUNT_ID,
  returnUrl: buildReturnUrl('KLARNA_RETURN_URL', getVercelBaseUrl()),
  customerRegion: process.env.KLARNA_CUSTOMER_REGION || 'krn:partner:eu1:region',
  callbackPath: '/api/klarna/callback'
};

const KLARNA_CONFIG_PROD = {
  username: process.env.KLARNA_PROD_USER_NAME,
  apiKey: process.env.KLARNA_PROD_PASSWORD,
  apiUrl: (process.env.KLARNA_PROD_BASE_URL || 'https://api-global.klarna.com').replace(/\/$/, ''),
  accountId: process.env.KLARNA_PROD_ACCOUNT_ID,
  returnUrl: buildReturnUrl('KLARNA_PROD_RETURN_URL', getVercelBaseUrl()),
  customerRegion: process.env.KLARNA_PROD_CUSTOMER_REGION || 'krn:partner:eu1:region',
  callbackPath: '/api/klarna/production/callback'
};

/** @param {'test'|'production'} env */
function getKlarnaConfig(env) {
  return env === 'production' ? KLARNA_CONFIG_PROD : KLARNA_CONFIG_TEST;
}

// Legacy single config for any code that still references it (test only)
const KLARNA_CONFIG = KLARNA_CONFIG_TEST;

// HTTP Basic Auth: Authorization header = "Basic " + base64(username + ":" + password).
// Identity API expects this (klarna_api_key); we do not use OAuth or any SDK.
function buildBasicAuthHeader(username, password) {
  if (!username || !password) {
    throw new Error('Username and password are required for Basic Auth');
  }
  const encoded = Buffer.from(`${username}:${password}`).toString('base64');
  return `Basic ${encoded}`;
}

/** Headers for Klarna Identity API. config = getKlarnaConfig('test'|'production'). */
function klarnaApiHeaders(config, extra = {}) {
  return {
    'Authorization': buildBasicAuthHeader(config.username, config.apiKey),
    'Content-Type': 'application/json',
    'X-Klarna-Customer-Region': config.customerRegion,
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

// Debug: check which Klarna envs have credentials (no secrets)
app.get('/api/klarna/status', (req, res) => {
  const test = getKlarnaConfig('test');
  const prod = getKlarnaConfig('production');
  res.json({
    test: {
      configured: !!(test.username && test.apiKey && test.accountId),
      hasUsername: !!test.username,
      hasApiKey: !!test.apiKey,
      hasAccountId: !!test.accountId,
      apiUrl: test.apiUrl,
      returnUrl: test.returnUrl ? `${test.returnUrl.replace(/\/$/, '')}${test.callbackPath}` : null
    },
    production: {
      configured: !!(prod.username && prod.apiKey && prod.accountId),
      hasUsername: !!prod.username,
      hasApiKey: !!prod.apiKey,
      hasAccountId: !!prod.accountId,
      apiUrl: prod.apiUrl,
      returnUrl: prod.returnUrl ? `${prod.returnUrl.replace(/\/$/, '')}${prod.callbackPath}` : null
    }
  });
});

// IMPORTANT: Callback route must be defined BEFORE the identity/request route
// to ensure it's matched correctly
// API endpoint for Klarna callback (after user completes identity flow)
app.all('/api/klarna/callback', async (req, res) => {
  try {
    console.log('=== CALLBACK ROUTE HIT ===');
    console.log('Method:', req.method);
    console.log('Request path:', req.path);
    console.log('Request URL:', req.url);
    console.log('Request originalUrl:', req.originalUrl);
    console.log('Request query:', req.query);
    console.log('Request query string:', req.url.split('?')[1]);
    console.log('Request headers:', JSON.stringify(req.headers, null, 2));
    
    // Parse query parameters manually if Express didn't parse them correctly
    let identity_request_id = req.query.identity_request_id;
    let state = req.query.state;
    
    // If query params are missing, try parsing from URL manually
    if (!identity_request_id && req.url.includes('identity_request_id=')) {
      const urlParams = new URLSearchParams(req.url.split('?')[1] || '');
      identity_request_id = urlParams.get('identity_request_id');
      state = urlParams.get('state') || state;
      console.log('Manually parsed identity_request_id:', identity_request_id);
      console.log('Manually parsed state:', state);
    }
    
    if (!identity_request_id) {
      console.error('Missing identity_request_id in callback');
      console.error('Full request details:', {
        method: req.method,
        path: req.path,
        url: req.url,
        originalUrl: req.originalUrl,
        query: req.query,
        queryString: req.url.split('?')[1]
      });
      // Return JSON error instead of redirect for debugging
      return res.status(400).json({ 
        error: 'Missing identity_request_id',
        receivedQuery: req.query,
        receivedUrl: req.url,
        parsedQueryString: req.url.split('?')[1]
      });
    }

    console.log('Klarna callback received:', { identity_request_id, state });
    
    // URL encode the identity_request_id (it contains colons and other special chars)
    const encodedId = encodeURIComponent(identity_request_id);
    const encodedState = state ? encodeURIComponent(state) : 'completed';
    
    // Redirect to home page with identity request ID (test flow; no env param)
    const redirectUrl = `/?identity_request_id=${encodedId}&state=${encodedState}`;
    console.log('Redirecting to:', redirectUrl);
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Klarna callback error:', error);
    console.error('Error stack:', error.stack);
    res.redirect('/?error=callback_failed');
  }
});

// Production callback: same as above but redirects with env=production so frontend uses production API
app.all('/api/klarna/production/callback', async (req, res) => {
  try {
    console.log('=== PRODUCTION CALLBACK ROUTE HIT ===');
    let identity_request_id = req.query.identity_request_id;
    let state = req.query.state;
    if (!identity_request_id && req.url.includes('identity_request_id=')) {
      const urlParams = new URLSearchParams(req.url.split('?')[1] || '');
      identity_request_id = urlParams.get('identity_request_id');
      state = urlParams.get('state') || state;
    }
    if (!identity_request_id) {
      return res.status(400).json({ error: 'Missing identity_request_id', receivedQuery: req.query });
    }
    const encodedId = encodeURIComponent(identity_request_id);
    const encodedState = state ? encodeURIComponent(state) : 'completed';
    const redirectUrl = `/?identity_request_id=${encodedId}&state=${encodedState}&env=production`;
    console.log('Redirecting to:', redirectUrl);
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Klarna production callback error:', error);
    res.redirect('/?error=callback_failed&env=production');
  }
});

// API endpoint to create Klarna Identity Request
// Body: optional { environment: 'test' | 'production' }. Default: test.
// Documentation: https://docs.klarna.com/conversion-boosters/sign-in-with-klarna/integrate-sign-in-with-klarna/klarna-identity-api/
app.post('/api/klarna/identity/request', async (req, res) => {
  try {
    console.log('[Identity] POST /api/klarna/identity/request received', { body: req.body });
    const env = (req.body && req.body.environment === 'production') ? 'production' : 'test';
    if (!req.body || typeof req.body !== 'object') {
      console.log('[Identity] No/invalid body, using env:', env);
    }
    const config = getKlarnaConfig(env);
    console.log('[Identity] Creating identity request', { env, hasUsername: !!config.username, hasApiKey: !!config.apiKey, hasAccountId: !!config.accountId, apiUrl: config.apiUrl });

    if (!config.username || !config.apiKey || !config.accountId) {
      const varHint = env === 'production'
        ? 'KLARNA_PROD_USER_NAME, KLARNA_PROD_PASSWORD, KLARNA_PROD_ACCOUNT_ID'
        : 'KLARNA_USER_NAME, KLARNA_PASSWORD, KLARNA_ACCOUNT_ID';
      console.error('Missing credentials for', env);
      return res.status(500).json({
        error: `Klarna ${env} credentials not configured. Please set ${varHint} environment variables.`
      });
    }

    const idempotencyKey = crypto.randomUUID();
    const accountId = config.accountId;
    let baseUrl = (config.returnUrl && String(config.returnUrl).trim()) || getVercelBaseUrl();
    baseUrl = baseUrl.replace(/\/$/, '');
    if (!baseUrl.startsWith('https://')) {
      baseUrl = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;
    }
    const returnUrl = `${baseUrl}${config.callbackPath}?identity_request_id={klarna.identity_request.id}&state={klarna.identity_request.state}`;
    if (!returnUrl || !returnUrl.startsWith('https://')) {
      console.error('[Identity] Invalid return URL', { env, baseUrl, returnUrl: returnUrl ? 'set' : 'undefined' });
      return res.status(500).json({ error: 'Return URL is not configured. Set KLARNA_RETURN_URL (test) or KLARNA_PROD_RETURN_URL (production), or ensure VERCEL_URL is set.' });
    }

    const identityRequest = {
      request_customer_token: {
        scopes: [
          'customer:login',
          'profile:verified:name',
          'profile:verified:date_of_birth',
          'profile:email',
          'profile:phone',
          'profile:billing_address',
          'profile:customer_id'
        ]
      },
      customer_interaction_config: {
        method: 'HANDOVER',
        return_url
      }
    };

    const apiUrl = `${config.apiUrl}/v2/accounts/${accountId}/identity/requests`;
    console.log('[Identity] Calling Klarna API', { env, apiUrl, returnUrl });

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: klarnaApiHeaders(config, {
        'Klarna-Idempotency-Key': idempotencyKey,
        'Partner-Correlation-Id': `partner-${env}-${Date.now()}`
      }),
      body: JSON.stringify(identityRequest)
    });

    console.log('[Identity] Klarna API response', { env, status: response.status, ok: response.ok });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Klarna API error:', response.status, errorText);
      console.error('Request URL:', apiUrl);
      console.error('Account ID used:', accountId);
      
      // Try to parse error response and extract error_id
      let errorDetails = errorText;
      let errorId = null;
      let errorType = null;
      let errorCode = null;
      let errorMessage = null;
      let validationErrors = null;
      
      try {
        const errorJson = JSON.parse(errorText);
        errorDetails = JSON.stringify(errorJson, null, 2);
        errorId = errorJson.error_id || errorJson.errorId;
        errorType = errorJson.error_type || errorJson.errorType;
        errorCode = errorJson.error_code || errorJson.errorCode;
        errorMessage = errorJson.error_message || errorJson.errorMessage;
        validationErrors = errorJson.validation_errors || errorJson.details || errorJson.errors;
        console.error('Parsed error:', errorDetails);
        if (errorId) {
          console.error('Klarna Error ID:', errorId, '- Use this ID when contacting Klarna support');
        }
        if (validationErrors) {
          console.error('Validation errors:', JSON.stringify(validationErrors, null, 2));
        }
      } catch (e) {
        // Not JSON, use as-is
      }
      
      // Log the exact request body for debugging validation errors
      if (response.status === 400) {
        console.error('Request body sent to Klarna:', JSON.stringify(identityRequest, null, 2));
        console.error('Return URL:', identityRequest.customer_interaction_config.return_url);
      }
      
      if (response.status === 401) {
        console.error('401 Unauthorized - API key authentication failed');
        console.error('Verify: 1) KLARNA_USER_NAME and KLARNA_PASSWORD are correct, 2) They match the test environment, 3) Account ID is correct');
      }
      
      const errorResponse = {
        error: `Klarna API error: ${response.status}`,
        error_id: errorId,
        error_type: errorType,
        error_code: errorCode,
        error_message: errorMessage,
        details: errorDetails,
        accountIdUsed: accountId,
        apiUrl: apiUrl,
        hint: errorId ? `Klarna Error ID: ${errorId} - Use this ID when contacting Klarna support` : (response.status === 401 ? 'Authentication failed. Verify KLARNA_USER_NAME, KLARNA_PASSWORD, and KLARNA_ACCOUNT_ID are correct and match the test environment.' : undefined)
      };
      
      // Add validation-specific fields for 400 errors
      if (response.status === 400) {
        errorResponse.validation_errors = validationErrors;
        errorResponse.requestBody = identityRequest;
      }
      
      return res.status(response.status).json(errorResponse);
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
// Query: optional env=production to use production credentials.
// Documentation: https://docs.klarna.com/conversion-boosters/sign-in-with-klarna/integrate-sign-in-with-klarna/klarna-identity-api/
app.get('/api/klarna/identity/request/:identityRequestId', async (req, res) => {
  try {
    const { identityRequestId } = req.params;
    const env = req.query.env === 'production' ? 'production' : 'test';
    const config = getKlarnaConfig(env);

    if (!config.username || !config.apiKey || !config.accountId) {
      const varHint = env === 'production'
        ? 'KLARNA_PROD_USER_NAME, KLARNA_PROD_PASSWORD, KLARNA_PROD_ACCOUNT_ID'
        : 'KLARNA_USER_NAME, KLARNA_PASSWORD, KLARNA_ACCOUNT_ID';
      return res.status(500).json({
        error: `Klarna ${env} credentials not configured. Please set ${varHint}.`
      });
    }

    const accountId = config.accountId;
    console.log('Reading identity request:', identityRequestId, 'env:', env);

    const encodedIdentityRequestId = encodeURIComponent(identityRequestId);
    const apiUrl = `${config.apiUrl}/v2/accounts/${accountId}/identity/requests/${encodedIdentityRequestId}`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: klarnaApiHeaders(config)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Klarna API error:', response.status);
      console.error('Error response:', errorText);
      console.error('Requested URL:', apiUrl);
      console.error('Identity Request ID used:', identityRequestId);
      console.error('Encoded ID used:', encodedIdentityRequestId);
      
      // Try to parse error response and extract error_id
      let errorDetails = errorText;
      let errorId = null;
      let errorType = null;
      let errorCode = null;
      let errorMessage = null;
      
      try {
        const errorJson = JSON.parse(errorText);
        errorDetails = JSON.stringify(errorJson, null, 2);
        errorId = errorJson.error_id || errorJson.errorId;
        errorType = errorJson.error_type || errorJson.errorType;
        errorCode = errorJson.error_code || errorJson.errorCode;
        errorMessage = errorJson.error_message || errorJson.errorMessage;
        console.error('Parsed error:', errorDetails);
        if (errorId) {
          console.error('Klarna Error ID:', errorId, '- Use this ID when contacting Klarna support');
        }
      } catch (e) {
        // Not JSON, use as-is
      }
      
      return res.status(response.status).json({ 
        error: `Klarna API error: ${response.status}`,
        error_id: errorId,
        error_type: errorType,
        error_code: errorCode,
        error_message: errorMessage,
        details: errorDetails,
        requestedUrl: apiUrl,
        identityRequestId: identityRequestId,
        hint: errorId ? `Klarna Error ID: ${errorId} - Use this ID when contacting Klarna support` : undefined
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Klarna identity request read error:', error);
    res.status(500).json({ error: 'Failed to read identity request', details: error.message });
  }
});

// Test route to verify API routing works
app.get('/api/test', (req, res) => {
  res.json({ message: 'API routes are working!', path: req.path, url: req.url });
});

// Debug route to test callback path
app.get('/api/klarna/callback/test', (req, res) => {
  res.json({ 
    message: 'Callback test route works!', 
    path: req.path, 
    url: req.url,
    query: req.query 
  });
});

// Test nested API path
app.get('/api/klarna/test', (req, res) => {
  res.json({ 
    message: 'Nested API path works!', 
    path: req.path, 
    url: req.url 
  });
});

// Debug: Log all unmatched routes before static files
app.use((req, res, next) => {
  // Only log if it's not a static file request
  if (!req.path.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
    console.log('Unmatched route:', req.method, req.path, req.url, req.query);
  }
  next();
});

// Serve static files LAST - after ALL API routes are defined
// This ensures /api/* routes are handled by Express, not static files
app.use(express.static(path.join(__dirname, 'src')));

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
