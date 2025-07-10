import passport from "passport";
import {
  Strategy as GoogleStrategy,
  Profile as GoogleProfile,
} from "passport-google-oauth20";
import { Strategy as MicrosoftStrategy } from "passport-microsoft";
import dotenv from "dotenv";
import pool from "../config/db";

dotenv.config();

interface User {
  id: number;
  name: string;
  email: string;
  profile_picture_url: string;
}

interface MicrosoftProfile {
  id: string;
  displayName: string;
  emails?: Array<{ value: string }>;
  photos?: Array<{ value: string }>;
  _json: { mail?: string; userPrincipalName?: string };
}

type OAuthProfile = GoogleProfile | MicrosoftProfile;

// Reusable function to get or create OAuth provider
async function getOrCreateProvider(providerName: string): Promise<number> {
  const { rows } = await pool.query(
    "SELECT id FROM oauth_providers WHERE provider_name = $1",
    [providerName]
  );
  if (rows[0]?.id) return rows[0].id;

  const result = await pool.query(
    "INSERT INTO oauth_providers (provider_name) VALUES ($1) RETURNING id",
    [providerName]
  );
  return result.rows[0].id;
}

// Reusable function to handle user creation or retrieval
async function handleUser(
  profile: OAuthProfile,
  providerId: number,
  providerName: string,
  done: (error: any, user?: any) => void
): Promise<void> {
  const email =
    providerName === "microsoft"
      ? (profile as MicrosoftProfile).emails?.[0]?.value ||
        (profile as MicrosoftProfile)._json.mail ||
        (profile as MicrosoftProfile)._json.userPrincipalName
      : profile.emails?.[0]?.value;
  const name = profile.displayName;
  const photo =
    providerName === "microsoft"
      ? (profile as MicrosoftProfile).photos?.[0]?.value || null
      : profile.photos?.[0]?.value;
  const oauthUserId = profile.id;

  if (!email || (providerName === "google" && !photo)) {
    return done(new Error(`Missing ${providerName} profile info`));
  }

  try {
    let { rows: userRows } = await pool.query(
      `SELECT users.* FROM users
       JOIN user_oauth_accounts uoa ON uoa.user_id = users.id
       WHERE uoa.oauth_user_id = $1 AND uoa.provider_id = $2`,
      [oauthUserId, providerId]
    );
    let user: User = userRows[0];

    if (!user) {
      const userRes = await pool.query(
        `INSERT INTO users (name, email, profile_picture_url)
         VALUES ($1, $2, $3) RETURNING *`,
        [name, email, photo]
      );
      user = userRes.rows[0];

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
      profile: GoogleProfile,
      done: (error: any, user?: any) => void
    ) => {
      const providerId = await getOrCreateProvider("google");
      await handleUser(profile, providerId, "google", done);
    }
  )
);

passport.use(
  new MicrosoftStrategy(
    {
      clientID: process.env.MICROSOFT_CLIENT_ID as string,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET as string,
      callbackURL: process.env.MICROSOFT_CALLBACK_URL as string,
      scope: ["user.read"],
    },
    async (
      accessToken: string,
      refreshToken: string | undefined,
      profile: MicrosoftProfile,
      done: (error: any, user?: any) => void
    ) => {
      const providerId = await getOrCreateProvider("microsoft");
      await handleUser(profile, providerId, "microsoft", done);
    }
  )
);

passport.serializeUser((user: any, done) => done(null, user.id));

passport.deserializeUser(async (id: number, done) => {
  try {
    const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [
      id,
    ]);
    done(null, rows[0]);
  } catch (err) {
    done(err);
  }
});

export default passport;


