import prisma from '../config/database';
import { generateOTP } from '../utils/crypto';
import { signToken } from '../utils/jwt';
import { sendEmail, generateOTPEmail } from '../utils/email';
import { Logger } from '../utils/logger';

const logger = new Logger('AuthService');

export class AuthService {
  async sendVerificationCode(email: string): Promise<void> {
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.emailVerification.create({
      data: {
        email,
        code,
        expiresAt,
      },
    });

    await sendEmail({
      to: email,
      subject: 'Your OnyxFlux Verification Code',
      html: generateOTPEmail(code),
    });

    logger.info(`Verification code sent to ${email}`);
  }

  async verifyCode(email: string, code: string): Promise<string> {
    const verification = await prisma.emailVerification.findFirst({
      where: {
        email,
        code,
        verified: false,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!verification) {
      throw new Error('Invalid or expired verification code');
    }

    await prisma.emailVerification.update({
      where: { id: verification.id },
      data: { verified: true },
    });

    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      const trialStart = new Date();
      const trialEnd = new Date(trialStart.getTime() + 5 * 24 * 60 * 60 * 1000);

      user = await prisma.user.create({
        data: {
          email,
          plan: 'FREE',
          trialStart,
          trialEnd,
          novaCreditsLeft: 0,
        },
      });

      logger.info(`New user created: ${email}`);
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      plan: user.plan,
    });

    logger.info(`User authenticated: ${email}`);
    return token;
  }

  async checkTrialExpiration(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return false;
    }

    if (user.plan === 'FREE' && user.trialEnd < new Date()) {
      return true;
    }

    return false;
  }
}
