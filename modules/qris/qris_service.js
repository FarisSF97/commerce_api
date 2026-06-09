const axios = require('axios');
const helper = require('../../common/helper');

const KLIKQRIS_BASE_URL = process.env.KLIKQRIS_BASE_URL || 'https://klikqris.com/api/sandbox';
const KLIKQRIS_API_KEY = process.env.KLIKQRIS_API_KEY;
const KLIKQRIS_MERCHANT_ID = process.env.KLIKQRIS_MERCHANT_ID;

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-api-key': KLIKQRIS_API_KEY,
    'id_merchant': KLIKQRIS_MERCHANT_ID
  };
}

exports.createKlikQrisTransaction = async (orderId, invoice, amount, keterangan) => {
  if (!KLIKQRIS_API_KEY || !KLIKQRIS_MERCHANT_ID) {
    throw new Error('KlikQRIS sandbox credentials not configured');
  }

  const payload = {
    order_id: String(orderId),
    id_merchant: KLIKQRIS_MERCHANT_ID,
    amount: amount,
    keterangan: keterangan || invoice
  };

  const response = await axios.post(`${KLIKQRIS_BASE_URL}/qris/create`, payload, {
    headers: getHeaders(),
    timeout: 15000
  });

  return response.data;
};

exports.checkKlikQrisStatus = async (orderId) => {
  if (!KLIKQRIS_API_KEY || !KLIKQRIS_MERCHANT_ID) {
    throw new Error('KlikQRIS sandbox credentials not configured');
  }

  const response = await axios.get(`${KLIKQRIS_BASE_URL}/qris/status/${orderId}`, {
    headers: getHeaders(),
    timeout: 10000
  });

  return response.data;
};
