import { config } from '../config/env';
import axios from 'axios';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  const { to, subject, html, from = config.email.from } = options;

  if (config.email.provider === 'sendgrid' && config.email.sendgridApiKey) {
    await sendViaSendGrid({ to, subject, html, from });
  } else if (config.email.provider === 'resend' && config.email.resendApiKey) {
    await sendViaResend({ to, subject, html, from });
  } else {
    console.log('Email would be sent:', { to, subject, from });
    console.log('HTML:', html);
  }
}

async function sendViaSendGrid(options: EmailOptions): Promise<void> {
  try {
    await axios.post(
      'https://api.sendgrid.com/v3/mail/send',
      {
        personalizations: [{ to: [{ email: options.to }] }],
        from: { email: options.from },
        subject: options.subject,
        content: [{ type: 'text/html', value: options.html }],
      },
      {
        headers: {
          Authorization: `Bearer ${config.email.sendgridApiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('SendGrid error:', error);
    throw new Error('Failed to send email via SendGrid');
  }
}

async function sendViaResend(options: EmailOptions): Promise<void> {
  try {
    await axios.post(
      'https://api.resend.com/emails',
      {
        from: options.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
      },
      {
        headers: {
          Authorization: `Bearer ${config.email.resendApiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Resend error:', error);
    throw new Error('Failed to send email via Resend');
  }
}

export function generateOTPEmail(code: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; }
        .container { background-color: white; padding: 30px; border-radius: 10px; max-width: 600px; margin: 0 auto; }
        .code { font-size: 32px; font-weight: bold; color: #6366f1; letter-spacing: 5px; text-align: center; padding: 20px; background-color: #f0f0f0; border-radius: 5px; margin: 20px 0; }
        .footer { color: #666; font-size: 12px; text-align: center; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>OnyxFlux Verification Code</h1>
        <p>Your verification code is:</p>
        <div class="code">${code}</div>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this code, please ignore this email.</p>
        <div class="footer">
          <p>© 2025 OnyxFlux. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function generateWhaleAlertEmail(data: {
  classification: string;
  amount: string;
  amountUsd: number;
  chain: string;
  tokenAddress: string;
  type: string;
}): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; }
        .container { background-color: white; padding: 30px; border-radius: 10px; max-width: 600px; margin: 0 auto; }
        .alert { background-color: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; margin: 20px 0; }
        .details { background-color: #f9fafb; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .footer { color: #666; font-size: 12px; text-align: center; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🐋 Whale Activity Detected</h1>
        <div class="alert">
          <strong>${data.classification.toUpperCase()}</strong> detected on ${data.chain}
        </div>
        <div class="details">
          <p><strong>Type:</strong> ${data.type}</p>
          <p><strong>Amount:</strong> ${data.amount}</p>
          <p><strong>USD Value:</strong> $${data.amountUsd.toLocaleString()}</p>
          <p><strong>Token:</strong> ${data.tokenAddress}</p>
          <p><strong>Chain:</strong> ${data.chain}</p>
        </div>
        <div class="footer">
          <p>© 2025 OnyxFlux. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
