import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User } from '../models';
import { config } from './env';
import { logger } from '../utils/logger';

export const configurePassport = (): void => {
  if (!config.googleClientId || !config.googleClientSecret) {
    logger.warn('[Passport Warning]: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing. Google OAuth will not function properly until credentials are configured.');
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: config.googleClientId || 'dummy_client_id',
        clientSecret: config.googleClientSecret || 'dummy_client_secret',
        callbackURL: config.googleCallbackUrl,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase().trim();
          if (!email) {
            return done(new Error('Google profile did not return an email address.'));
          }

          const fullName = profile.displayName || `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim() || 'Google User';
          const avatarUrl = profile.photos?.[0]?.value || undefined;
          const googleId = profile.id;

          // 1. Check if user exists by email
          let user = await User.findOne({ email });

          if (user) {
            // User exists: link googleId and update avatarUrl if missing
            let updated = false;
            if (!user.googleId) {
              user.googleId = googleId;
              updated = true;
            }
            if (!user.avatarUrl && avatarUrl) {
              user.avatarUrl = avatarUrl;
              updated = true;
            }
            if (updated) {
              await user.save();
            }

            const userPayload: Express.User & { isSuspended?: boolean; suspensionReason?: string | null } = {
              id: user._id.toString(),
              email: user.email,
              role: user.role,
              fullName: user.fullName,
              avatarUrl: user.avatarUrl,
              isSuspended: user.isSuspended,
              suspensionReason: user.suspensionReason,
            };
            return done(null, userPayload as Express.User);
          }

          // 2. User does not exist: create brand new user with pending role
          user = await User.create({
            email,
            fullName,
            avatarUrl,
            googleId,
            authProvider: 'google',
            role: 'pending',
          });

          const newUserPayload: Express.User & { isSuspended?: boolean; suspensionReason?: string | null } = {
            id: user._id.toString(),
            email: user.email,
            role: user.role,
            fullName: user.fullName,
            avatarUrl: user.avatarUrl,
            isSuspended: user.isSuspended,
            suspensionReason: user.suspensionReason,
          };
          return done(null, newUserPayload as Express.User);
        } catch (err) {
          logger.error(`[Google Strategy Error]: ${err instanceof Error ? err.message : err}`);
          return done(err as Error, undefined);
        }
      }
    )
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id || user._id?.toString());
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await User.findById(id);
      if (!user) {
        return done(null, false);
      }
      const userPayload: Express.User = {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
      };
      done(null, userPayload);
    } catch (err) {
      done(err, null);
    }
  });
};
