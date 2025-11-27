import nodemailer from 'nodemailer';
import env from '../config/env';
import { logger } from './logger';

const transporter = nodemailer.createTransport({
  host: env.EMAIL_SERVER,
  port: parseInt(env.EMAIL_PORT),
  secure: parseInt(env.EMAIL_PORT) === 465,
  auth: {
    user: env.EMAIL_USER,
    pass: env.EMAIL_PASS,
  },
});

export async function sendWelcomeEmail(email: string, name: string) {
  try {
    await transporter.sendMail({
      from: env.EMAIL_FROM,
      to: email,
      subject: 'Welcome to OnyxFlux',
      html: `
        <h1>Welcome to OnyxFlux, ${name}!</h1>
        <p>Thank you for joining OnyxFlux, the multi-chain Web3 API platform.</p>
        <p>You can now start using our API services. Visit your dashboard to generate API keys and explore our features.</p>
        <p>If you have any questions, feel free to reach out to us at ${env.EMAIL_FROM}</p>
        <p>Best regards,<br>The OnyxFlux Team</p>
      `,
    });
    logger.info(`Welcome email sent to ${email}`);
  } catch (error) {
    logger.error('Failed to send welcome email', { error, email });
  }
}

export async function sendPlanUpgradeEmail(email: string, name: string, plan: string) {
  try {
    await transporter.sendMail({
      from: env.EMAIL_FROM,
      to: email,
      subject: `Your OnyxFlux Plan Has Been Upgraded to ${plan}`,
      html: `
        <h1>Plan Upgraded Successfully!</h1>
        <p>Hi ${name},</p>
        <p>Your OnyxFlux plan has been upgraded to <strong>${plan}</strong>.</p>
        <p>You now have access to enhanced features and higher rate limits.</p>
        <p>Visit your dashboard to explore your new capabilities.</p>
        <p>Best regards,<br>The OnyxFlux Team</p>
      `,
    });
    logger.info(`Plan upgrade email sent to ${email}`);
  } catch (error) {
    logger.error('Failed to send plan upgrade email', { error, email });
  }
}
