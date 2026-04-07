import { Resend } from 'resend';
import { env } from '@shared/config/env.js';
import { logger } from './logger.js';
const resend = new Resend(env.RESEND_API_KEY);
export async function sendEmail(options) {
    try {
        const { data, error } = await resend.emails.send({
            from: env.EMAIL_FROM,
            to: options.to,
            subject: options.subject,
            html: options.html,
            text: options.text,
        });
        if (error) {
            logger.error('Resend email error:', error);
            throw new Error(`Failed to send email: ${error.message}`);
        }
        logger.info(`Email sent successfully: ${data?.id}`);
    }
    catch (error) {
        logger.error('Email sending failed:', error);
        throw error;
    }
}
// Email templates
export async function sendVerificationEmail(to, name, token, isLogin) {
    const verificationUrl = `${env.CLIENT_URL}/auth/account-verification?token=${token}` + (isLogin ? '&context=login' : '');
    await sendEmail({
        to,
        subject: 'Verify your email address',
        html: `
      <h2>Welcome to MealJet!, ${name}</h2>
      <p>Please verify your email address by clicking the link below:</p>
      <a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
        Verify Email
      </a>
      <p>Or copy and paste this link into your browser:</p>
      <p>${verificationUrl}</p>
      <p>This link will expire in 24 hours.</p>
    `,
        text: `Welcome to MealJet! Please verify your email by visiting: ${verificationUrl}`,
    });
}
export async function sendPasswordResetEmail(to, token) {
    const resetUrl = `${env.CLIENT_URL}/reset-password?token=${token}`;
    await sendEmail({
        to,
        subject: 'Reset your password',
        html: `
      <h2>Password Reset Request</h2>
      <p>You requested to reset your password. Click the link below to proceed:</p>
      <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
        Reset Password
      </a>
      <p>Or copy and paste this link into your browser:</p>
      <p>${resetUrl}</p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `,
        text: `Reset your password by visiting: ${resetUrl}`,
    });
}
export async function sendOrderConfirmationEmail(to, orderDetails) {
    const itemsList = orderDetails.items.map((item) => `<li>${item}</li>`).join('');
    await sendEmail({
        to,
        subject: `Order Confirmation - #${orderDetails.orderId}`,
        html: `
      <h2>Order Confirmed!</h2>
      <p>Thank you for your order. Your order #${orderDetails.orderId} has been confirmed.</p>
      <h3>Order Summary:</h3>
      <ul>${itemsList}</ul>
      <p><strong>Total: $${orderDetails.total.toFixed(2)}</strong></p>
      <p>We'll notify you once your order is on its way!</p>
    `,
        text: `Order #${orderDetails.orderId} confirmed. Total: $${orderDetails.total.toFixed(2)}`,
    });
}
export async function sendWelcomeEmail(to, name) {
    await sendEmail({
        to,
        subject: 'Welcome to MealJet!',
        html: `
      <h2>Welcome, ${name}!</h2>
      <p>We're excited to have you on board.</p>
      <p>Start exploring amazing restaurants and delicious meals in your area.</p>
      <a href="${env.CLIENT_URL}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
        Browse Restaurants
      </a>
    `,
        text: `Welcome to MealJet, ${name}! Visit ${env.CLIENT_URL} to get started.`,
    });
}
