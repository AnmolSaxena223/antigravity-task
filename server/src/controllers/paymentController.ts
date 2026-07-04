import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { User } from '../models/User';
import { Transaction } from '../models/Transaction';
import crypto from 'crypto';
import Razorpay from 'razorpay';

// Ensure configuration/dotenv variables are loaded before Razorpay client setup
import { config } from '../config/env';

let razorpayInstance: Razorpay | null = null;

// Initialize the Razorpay client exactly once at module level
const getRazorpayInstance = (): Razorpay => {
  if (razorpayInstance) {
    return razorpayInstance;
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    console.error('[Razorpay Init Error] Environment variables RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET are missing.');
    throw new Error('Razorpay is not configured on the server. Please check environment variables.');
  }

  // Print first 10 characters of the Key ID (never print the secret)
  const prefixId = keyId.substring(0, 10);
  console.log(`[Razorpay Service] Initializing single Razorpay instance. Key ID Prefix: ${prefixId}...`);

  // Mismatch detection: check if test credentials are mixed with live ones
  const isKeyTest = keyId.toLowerCase().includes('test');
  const isKeyLive = keyId.toLowerCase().includes('live');
  const isSecretTest = keySecret.toLowerCase().includes('test');
  const isSecretLive = keySecret.toLowerCase().includes('live');

  if (isKeyTest && isSecretLive) {
    console.warn('[Razorpay Config Mismatch] WARNING: Test Key ID is paired with a Live Secret!');
  } else if (isKeyLive && isSecretTest) {
    console.warn('[Razorpay Config Mismatch] WARNING: Live Key ID is paired with a Test Secret!');
  }

  try {
    razorpayInstance = new Razorpay({ key_id: keyId, key_secret: keySecret });
    return razorpayInstance;
  } catch (err: any) {
    console.error('[Razorpay Client Constructor Error]', err);
    throw err;
  }
};

/**
 * Creates a new Razorpay Order (POST /payment/create-order)
 */
export const createOrder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { amount } = req.body;
    if (!amount || typeof amount !== 'number' || amount < 10 || amount > 50000) {
      return res.status(400).json({ success: false, message: 'Invalid amount. Minimum ₹10, Maximum ₹50,000.' });
    }

    const user = await User.findById(req.user?.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const razorpay = getRazorpayInstance();

    console.log(`[Razorpay API] Generating Order for Amount: ₹${amount}`);
    const rzpOrder = await razorpay.orders.create({
      amount: Math.round(amount * 100), // paise
      currency: 'INR',
      receipt: 'rcpt_' + crypto.randomBytes(4).toString('hex')
    });

    const transaction = new Transaction({
      userId: user._id,
      type: 'deposit',
      amount,
      balanceType: 'deposit',
      status: 'pending',
      paymentGateway: 'razorpay',
      paymentId: rzpOrder.id,
      description: 'Deposit via Razorpay checkout'
    });

    await transaction.save();
    console.log(`[Razorpay API] Order registered in MongoDB: ${rzpOrder.id}`);

    return res.status(200).json({
      success: true,
      keyId: process.env.RAZORPAY_KEY_ID,
      amount: transaction.amount,
      currency: 'INR',
      orderId: rzpOrder.id,
      transactionId: transaction._id
    });
  } catch (error: any) {
    console.error('[Razorpay Order Creation Failed Error]', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Verifies Razorpay checkout payment signature (POST /payment/verify)
 */
export const verifyPayment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing required checkout verification parameters.' });
    }

    const transaction = await Transaction.findOne({ paymentId: razorpay_order_id });
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction order not found.' });
    }

    // Idempotency: Ignore duplicate updates
    if (transaction.status === 'completed') {
      return res.status(200).json({ success: true, message: 'Payment already verified and credited.' });
    }

    // Perform signature verification
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      console.error('[Razorpay Signature Error] Verification mismatch!');
      console.error(`- Received Signature: ${razorpay_signature}`);
      console.error(`- Expected Signature: ${expectedSignature}`);

      transaction.status = 'failed';
      transaction.description = 'Razorpay signature verification failed (checkout signature discrepancy)';
      await transaction.save();
      return res.status(400).json({ success: false, message: 'Invalid payment signature.' });
    }

    transaction.status = 'completed';
    transaction.description = `Deposit via Razorpay Standard Checkout (Payment ID: ${razorpay_payment_id})`;
    await transaction.save();

    // Increment wallet atomically
    await User.findByIdAndUpdate(transaction.userId, {
      $inc: { 'balance.deposit': transaction.amount }
    });

    console.log(`[Payment Success] Order ${razorpay_order_id} verified & credited to user ${transaction.userId}`);

    return res.status(200).json({
      success: true,
      message: 'Payment verified and credited successfully.'
    });
  } catch (error: any) {
    console.error('[Razorpay Signature Verification Failed Error]', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Razorpay Webhook listener (POST /payment/webhook)
 */
export const verifyPaymentWebhook = async (req: any, res: Response) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!signature) {
      return res.status(400).json({ success: false, message: 'Missing webhook signature header.' });
    }

    if (!webhookSecret) {
      return res.status(500).json({ success: false, message: 'Webhook secret is not configured on server.' });
    }

    // Cryptographic validation of raw body
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(req.rawBody || JSON.stringify(req.body))
      .digest('hex');

    if (signature !== expectedSignature) {
      console.error('[Razorpay Webhook Error] Invalid signature header received.');
      console.error(`- Received: ${signature}`);
      console.error(`- Expected: ${expectedSignature}`);
      return res.status(400).json({ success: false, message: 'Webhook signature verification failed.' });
    }

    const event = req.body.event;
    console.log(`[Webhook Event] Received Razorpay event: ${event}`);
    
    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = req.body.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const paymentId = paymentEntity?.id;

      if (!orderId) {
        return res.status(200).json({ success: true, message: 'No order ID present in payload.' });
      }

      const transaction = await Transaction.findOne({ paymentId: orderId });
      if (!transaction) {
        return res.status(200).json({ success: true, message: 'No pending transaction matched order ID.' });
      }

      // Idempotency: Ignore duplicate webhook events
      if (transaction.status === 'completed') {
        return res.status(200).json({ success: true, message: 'Already processed and credited.' });
      }

      transaction.status = 'completed';
      transaction.description = `Deposit via Razorpay Webhook (Payment ID: ${paymentId})`;
      await transaction.save();

      await User.findByIdAndUpdate(transaction.userId, {
        $inc: { 'balance.deposit': transaction.amount }
      });

      console.log(`[Webhook Service] Wallet credited successfully for order ${orderId} via webhook.`);
    }

    return res.status(200).json({ success: true, message: 'Webhook event processed.' });
  } catch (error: any) {
    console.error('[Webhook Processing Error]', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
