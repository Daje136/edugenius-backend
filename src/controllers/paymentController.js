'use strict';
const axios = require('axios');
const pool  = require('../config/postgres');

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

// POST /api/payments/initialize
exports.initializePayment = async (req, res) => {
  const { planId } = req.body;

  // Get plan details
  const { rows } = await pool.query(
    'SELECT * FROM plans WHERE id = $1', [planId]
  );
  if (!rows.length) {
    return res.status(404).json({ success: false, message: 'Plan not found' });
  }

  const plan = rows[0];

  if (plan.price === 0) {
    // Free plan — activate immediately
    await activateFreePlan(req.user.id, plan.id);
    return res.json({ success: true, message: 'Free plan activated', free: true });
  }

  // Initialize Paystack payment
  const response = await axios.post(
    'https://api.paystack.co/transaction/initialize',
    {
      email:        req.user.email,
      amount:       plan.price * 100, // Paystack uses kobo
      reference:    `EDU-${req.user.id}-${Date.now()}`,
      callback_url: `${process.env.FRONTEND_URL}/payment-success.html`,
      metadata: {
        user_id: req.user.id,
        plan_id: plan.id,
        plan_name: plan.name,
      }
    },
    {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json',
      }
    }
  );

  const { authorization_url, reference } = response.data.data;

  // Save pending payment
  await pool.query(`
    INSERT INTO subscriptions (user_id, plan_id, status, paystack_ref, expires_at)
    VALUES ($1, $2, 'pending', $3, NOW() + INTERVAL '30 days')
  `, [req.user.id, plan.id, reference]);

  res.json({
    success: true,
    paymentUrl: authorization_url,
    reference,
  });
};

// POST /api/payments/verify
exports.verifyPayment = async (req, res) => {
  const { reference } = req.body;

  const response = await axios.get(
    `https://api.paystack.co/transaction/verify/${reference}`,
    {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` }
    }
  );

  const { status, metadata } = response.data.data;

  if (status === 'success') {
    // Activate subscription
    await pool.query(`
      UPDATE subscriptions
      SET status = 'active',
          started_at = NOW(),
          expires_at = NOW() + INTERVAL '30 days'
      WHERE paystack_ref = $1
    `, [reference]);

    res.json({ success: true, message: 'Payment verified and plan activated!' });
  } else {
    res.status(400).json({ success: false, message: 'Payment not successful' });
  }
};

// POST /api/payments/webhook
exports.webhook = async (req, res) => {
  const secret = PAYSTACK_SECRET;
  const hash   = require('crypto')
    .createHmac('sha512', secret)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (hash !== req.headers['x-paystack-signature']) {
    return res.status(401).send('Invalid signature');
  }

  const { event, data } = req.body;

  if (event === 'charge.success') {
    await pool.query(`
      UPDATE subscriptions
      SET status = 'active',
          started_at = NOW(),
          expires_at = NOW() + INTERVAL '30 days'
      WHERE paystack_ref = $1
    `, [data.reference]);
  }

  res.sendStatus(200);
};

async function activateFreePlan(userId, planId) {
  await pool.query(`
    INSERT INTO subscriptions (user_id, plan_id, status, expires_at)
    VALUES ($1, $2, 'active', NULL)
    ON CONFLICT DO NOTHING
  `, [userId, planId]);
}