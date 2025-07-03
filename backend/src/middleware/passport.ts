import passport from "passport";
import { Strategy as GoogleStrategy, Profile } from "passport-google-oauth20";
import dotenv from "dotenv";
import pool from "../config/db"; 


dotenv.config();

interface User {
  id: number;
  name: string;
  email: string;
  profile_picture_url: string;
}

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      callbackURL: process.env.GOOGLE_CALLBACK_URL as string,
    },
    async (
      accessToken: string,
      refreshToken: string,
      profile: Profile,
      done: (error: any, user?: any) => void
    ) => {
      const email = profile.emails?.[0]?.value;
      const name = profile.displayName;
      const photo = profile.photos?.[0]?.value;
      const oauthUserId = profile.id;

      if (!email || !photo) {
        return done(new Error("Missing required profile info from Google"));
      }

      try {
        // Get or insert OAuth provider
        let result = await pool.query(
          "SELECT id FROM oauth_providers WHERE provider_name = $1",
          ["google"]
        );
        let providerId = result.rows[0]?.id;

        if (!providerId) {
          result = await pool.query(
            "INSERT INTO oauth_providers (provider_name) VALUES ($1) RETURNING id",
            ["google"]
          );
          providerId = result.rows[0].id;
        }

        // Check if user already exists
        result = await pool.query(
          `SELECT users.* FROM users
           JOIN user_oauth_accounts uoa ON uoa.user_id = users.id
           WHERE uoa.oauth_user_id = $1 AND uoa.provider_id = $2`,
          [oauthUserId, providerId]
        );

        let user: User = result.rows[0];

        if (!user) {
          // Create new user
          const userRes = await pool.query(
            `INSERT INTO users (name, email, profile_picture_url)
             VALUES ($1, $2, $3) RETURNING *`,
            [name, email, photo]
          );
          user = userRes.rows[0];

          // Link to OAuth account
          await pool.query(
            `INSERT INTO user_oauth_accounts (user_id, provider_id, oauth_user_id)
             VALUES ($1, $2, $3)`,
            [user.id, providerId, oauthUserId]
          );
        }

        done(null, user);
      } catch (err) {
        done(err);
      }
    }
  )
);

// Session handling
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
    const user: User = result.rows[0];
    done(null, user);
  } catch (err) {
    done(err);
  }
});

export default passport;
