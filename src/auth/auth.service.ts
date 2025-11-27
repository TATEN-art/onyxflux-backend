import { OAuth2Client } from 'google-auth-library';
import { PrismaClient } from '@prisma/client';
import { nanoid } from 'nanoid';
import env from '../config/env';
import { AppError } from '../utils/errorHandler';
import { sendWelcomeEmail } from '../utils/email';

const prisma = new PrismaClient();
const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

export async function verifyGoogleToken(idToken: string) {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload) {
      throw new AppError(401, 'Invalid Google token');
    }

    if (!payload.email_verified) {
      throw new AppError(401, 'Email not verified');
    }

    return {
      googleId: payload.sub,
      email: payload.email!,
      name: payload.name || payload.email!.split('@')[0],
    };
  } catch (error) {
    throw new AppError(401, 'Failed to verify Google token');
  }
}

export async function createOrUpdateUser(googleData: {
  googleId: string;
  email: string;
  name: string;
}) {
  let user = await prisma.user.findUnique({
    where: { googleId: googleData.googleId },
  });

  const isNewUser = !user;

  if (!user) {
    user = await prisma.user.findUnique({
      where: { email: googleData.email },
    });
  }

  if (user) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        googleId: googleData.googleId,
        name: googleData.name,
        emailVerified: true,
      },
    });
  } else {
    user = await prisma.user.create({
      data: {
        googleId: googleData.googleId,
        email: googleData.email,
        name: googleData.name,
        emailVerified: true,
        plan: 'free',
      },
    });

    await sendWelcomeEmail(user.email, user.name || 'User');
  }

  return { user, isNewUser };
}

export async function createSession(userId: string) {
  const token = nanoid(64);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const session = await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });

  return session;
}

export async function deleteSession(token: string) {
  await prisma.session.delete({
    where: { token },
  });
}
