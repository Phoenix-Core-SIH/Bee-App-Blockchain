const axios = require('axios');
require('dotenv').config();

const BLOCKCHAIN_URL = process.env.BLOCKCHAIN_URL || 'http://localhost:3001';
const DJANGO_URL = process.env.DJANGO_URL || 'http://localhost:8000';

const blockchainClient = axios.create({
  baseURL: BLOCKCHAIN_URL,
  timeout: 5000
});

const djangoClient = axios.create({
  baseURL: DJANGO_URL,
  timeout: 5000
});

// We need a mechanism to fetch with service credentials.
// For the blockchain backend, we might need a service token.
// For now, we assume the token is passed in env or we just call the endpoints.
// We will intercept requests to inject tokens if necessary.

let blockchainToken = process.env.SERVICE_BLOCKCHAIN_TOKEN || '';

async function fetchFromBlockchain(endpoint) {
  try {
    if (!blockchainToken) {
      const loginRes = await blockchainClient.post('/auth/login', { username: 'admin', password: 'admin123' });
      blockchainToken = loginRes.data.token;
    }
    const res = await blockchainClient.get(endpoint, {
      headers: { Authorization: `Bearer ${blockchainToken}` }
    });
    return { data: res.data, error: null };
  } catch (err) {
    console.error(`[Blockchain Backend Error] ${endpoint}:`, err.message);
    return { data: null, error: err.message };
  }
}

async function fetchFromDjango(endpoint) {
  try {
    const token = process.env.SERVICE_DJANGO_TOKEN || '';
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await djangoClient.get(endpoint, { headers });
    return { data: res.data, error: null };
  } catch (err) {
    console.error(`[Django Backend Error] ${endpoint}:`, err.message);
    return { data: null, error: err.message };
  }
}

module.exports = {
  blockchainClient,
  djangoClient,
  fetchFromBlockchain,
  fetchFromDjango
};
