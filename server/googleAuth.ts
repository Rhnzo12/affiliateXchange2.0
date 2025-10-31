import type { Express } from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { storage } from "./storage";
import type { User } from "../shared/schema";

// Google OAuth Strategy Configuration
export async function setupGoogleAuth(app: Express) {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const callbackURL = process.env.GOOGLE_CALLBACK_URL || "/api/auth/google/callback";

  // Only setup Google auth if credentials are provided
  if (!googleClientId || !googleClientSecret) {
    console.log("[Google Auth] Google OAuth credentials not configured. Skipping Google authentication setup.");
    return;
  }

  // Configure Google OAuth Strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: googleClientId,
        clientSecret: googleClientSecret,
        callbackURL: callbackURL,
        scope: ["profile", "email"],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const googleId = profile.id;
          const email = profile.emails?.[0]?.value;
          const firstName = profile.name?.givenName;
          const lastName = profile.name?.familyName;
          const profileImageUrl = profile.photos?.[0]?.value;

          if (!email) {
            return done(new Error("No email found in Google profile"), undefined);
          }

          // Check if user already exists with this Google ID
          let user = await storage.getUserByGoogleId(googleId);

          if (user) {
            // User exists with this Google ID - log them in
            return done(null, user);
          }

          // Check if user exists with this email (might be a local account)
          user = await storage.getUserByEmail(email);

          if (user) {
            // User exists with this email but no Google ID - link the accounts
            if (user.googleId) {
              // This shouldn't happen, but if it does, it's a data inconsistency
              return done(new Error("Account linking error"), undefined);
            }

            // Update the user with Google ID to link accounts
            const updatedUser = await storage.updateUser(user.id, {
              googleId: googleId,
              firstName: firstName || user.firstName,
              lastName: lastName || user.lastName,
              profileImageUrl: profileImageUrl || user.profileImageUrl,
            });

            return done(null, updatedUser);
          }

          // New user - create account with Google
          // Generate username from email (before @)
          const baseUsername = email.split("@")[0];
          let username = baseUsername;
          let counter = 1;

          // Check if username exists, if so, add a counter
          while (await storage.getUserByUsername(username)) {
            username = `${baseUsername}${counter}`;
            counter++;
          }

          // Create new user - default to 'creator' role
          // User can be prompted to select role on first login if needed
          const newUser = await storage.createUser({
            username,
            email,
            password: null, // No password for OAuth users
            googleId: googleId,
            firstName: firstName || null,
            lastName: lastName || null,
            profileImageUrl: profileImageUrl || null,
            role: 'creator', // Default role, can be changed later
            accountStatus: 'active',
          });

          // Create default creator profile for new Google users
          await storage.createCreatorProfile({
            userId: newUser.id,
            bio: null,
            youtubeUrl: null,
            tiktokUrl: null,
            instagramUrl: null,
            youtubeFollowers: null,
            tiktokFollowers: null,
            instagramFollowers: null,
            niches: [],
          });

          return done(null, newUser);
        } catch (error) {
          console.error("[Google Auth] Error during authentication:", error);
          return done(error as Error, undefined);
        }
      }
    )
  );

  // Google OAuth routes
  app.get(
    "/api/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
  );

  app.get(
    "/api/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/login?error=google_auth_failed" }),
    (req, res) => {
      // Successful authentication
      const user = req.user as User;

      // Redirect based on role
      if (user.role === "creator") {
        res.redirect("/browse");
      } else if (user.role === "company") {
        res.redirect("/company/dashboard");
      } else if (user.role === "admin") {
        res.redirect("/admin");
      } else {
        res.redirect("/");
      }
    }
  );

  console.log("[Google Auth] Google OAuth authentication configured successfully");
}
