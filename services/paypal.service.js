// PayPal Service - Handles all PayPal payment logic
const axios = require('axios');

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';
const PAYPAL_MODE = process.env.PAYPAL_MODE || 'sandbox';

const PAYPAL_API_BASE = PAYPAL_MODE === 'live' 
  ? 'https://api-m.paypal.com' 
  : 'https://api-m.sandbox.paypal.com';

async function getPayPalAccessToken() {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new Error('PayPal credentials not configured');
  }
  
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
  const response = await axios.post(`${PAYPAL_API_BASE}/v1/oauth2/token`, 
    'grant_type=client_credentials',
    {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  );
  return response.data.access_token;
}

async function createPayPalOrder(guildId, tier, durationMonths, pricing) {
  const amount = pricing[tier]?.[durationMonths];
  if (!amount) {
    throw new Error('Invalid tier or duration');
  }
  
  const accessToken = await getPayPalAccessToken();
  
  const orderData = {
    intent: 'CAPTURE',
    purchase_units: [{
      reference_id: guildId,
      description: `Spidey Bot ${tier.toUpperCase()} Upgrade - ${durationMonths} Months`,
      custom_id: JSON.stringify({ guildId, tier, durationMonths }),
      amount: {
        currency_code: 'USD',
        value: amount.toString()
      }
    }],
    application_context: {
      brand_name: 'Spidey Bot',
      landing_page: 'NO_PREFERENCE',
      user_action: 'PAY_NOW',
      return_url: `${process.env.BASE_URL}/premium?success=true`,
      cancel_url: `${process.env.BASE_URL}/premium?cancelled=true`
    }
  };
  
  const response = await axios.post(`${PAYPAL_API_BASE}/v2/checkout/orders`, orderData, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  return {
    orderId: response.data.id,
    approvalUrl: response.data.links.find(l => l.rel === 'approve').href
  };
}

async function capturePayPalOrder(orderId) {
  const accessToken = await getPayPalAccessToken();
  
  const response = await axios.post(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`, {}, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (response.data.status === 'COMPLETED') {
    const customId = response.data.purchase_units[0]?.custom_id;
    const purchase = response.data.purchase_units[0]?.payments?.captures?.[0];
    
    let guildId, tier, durationMonths;
    try {
      const customData = JSON.parse(customId);
      guildId = customData.guildId;
      tier = customData.tier;
      durationMonths = customData.durationMonths;
    } catch (e) {
      throw new Error('Invalid custom data');
    }
    
    return {
      success: true,
      guildId,
      tier,
      durationMonths,
      amount: purchase.amount.value,
      currency: purchase.amount.currency_code
    };
  }
  
  throw new Error('Order not completed');
}

module.exports = {
  getPayPalAccessToken,
  createPayPalOrder,
  capturePayPalOrder
};