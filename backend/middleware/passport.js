const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const pool = require("../config/db");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      const email = profile.emails[0].value;
      const name = profile.displayName;
      const photo = profile.photos[0].value;
      const oauthUserId = profile.id;

      try {
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

        result = await pool.query(
          `SELECT users.* FROM users
           JOIN user_oauth_accounts uoa ON uoa.user_id = users.id
           WHERE uoa.oauth_user_id = $1 AND uoa.provider_id = $2`,
          [oauthUserId, providerId]
        );

        let user = result.rows[0];

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
        done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
    done(null, result.rows[0]);
  } catch (err) {
    done(err, null);
  }
});