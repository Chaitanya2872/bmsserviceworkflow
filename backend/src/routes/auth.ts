import express, { Request, Response, NextFunction } from "express";
import passport from "passport";
import jwt, { JwtPayload } from "jsonwebtoken";
import pool from "../config/db";
import dotenv from "dotenv";
import { QueryResult } from "pg";

dotenv.config();

const router = express.Router();

// Extend Express Request to include 'user'
interface AuthenticatedRequest extends Request {
  user?: any; // You can replace 'any' with a proper User type later
}

interface User {
  id: number;
  user_id: string;
  name: string;
  email: string;
  password: string;
  created_at: Date;
  refresh_token?: string;
}

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET as string;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET as string;
console.log(ACCESS_TOKEN_SECRET)
console.log(REFRESH_TOKEN_SECRET)

// Token generators
function generateAccessToken(user: Pick<User, "id" | "email">): string {
  return jwt.sign({ id: user.id, email: user.email }, ACCESS_TOKEN_SECRET, {
    expiresIn: "15m",
  });
}

function generateRefreshToken(user: Pick<User, "id" | "email">): string {
  return jwt.sign({ id: user.id, email: user.email }, REFRESH_TOKEN_SECRET, {
    expiresIn: "30m",
  });
}

// User ID generator
function generateRandom11Digits(): number {
  return Math.floor(100000000000 + Math.random() * 900000000000);
}

function generateUserId(): string {
  return `BMSU${generateRandom11Digits()}`;
}

//  Google OAuth
router.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
  })
);

router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req: AuthenticatedRequest, res: Response) => {
    res.send({ user: req.user });
  }
);

//  Microsoft OAuth
router.get(
  "/auth/microsoft",
  passport.authenticate("microsoft", {
    scope: ["user.read"],
    prompt: "select_account",
  })
);

router.get(
  "/auth/microsoft/callback",
  passport.authenticate("microsoft", { failureRedirect: "/login" }),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) return res.redirect("/dashboard");
    res.send({ user: req.user });
  }
);

// Register
router.post("/register", async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  try {
    let user_id: string | null = null;

    for (let i = 0; i < 5; i++) {
      const generatedId = generateUserId();
      const result: QueryResult = await pool.query(
        "SELECT 1 FROM users WHERE user_id = $1",
        [generatedId]
      );
      if (result.rowCount === 0) {
        user_id = generatedId;
        break;
      }
    }

    if (!user_id) {
      return res.status(500).json({ error: "Failed to generate unique user ID" });
    }

    await pool.query(
      `INSERT INTO users (user_id, name, email, password) VALUES ($1, $2, $3, $4)`,
      [user_id, name, email, password]
    );

    res.status(201).json({
      message: "Registered successfully",
      user_id,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const { rows }: QueryResult<User> = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    const user = rows[0];

    if (!user) return res.status(400).json({ error: "User not found" });
    if (user.password !== password) return res.status(401).json({ error: "Invalid credentials" });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    const now = Date.now();
    const accessTokenExpiry = new Date(now + 15 * 60 * 1000).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const refreshTokenExpiry = new Date(now + 30 * 60 * 1000).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    console.log("Access Token Expiry (IST):", accessTokenExpiry);
    console.log("Refresh Token Expiry (IST):", refreshTokenExpiry);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false,
      path: "/api/auth/refresh-token",
      sameSite: "strict",
      maxAge: 30 * 60 * 1000,
    });

    res.json({
      id: user.id,
      user: {
        name: user.name || null,
        user_id: user.user_id,
        email: user.email,
        password: user.password,
        created_at: user.created_at,
        accessToken,
        refreshToken,
        accessTokenExpiresAt: accessTokenExpiry,
        refreshTokenExpiresAt: refreshTokenExpiry,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

//  Refresh Token
router.post("/refresh-token", async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken;
  if (!token) return res.status(401).json({ error: "Refresh token required" });

  try {
    const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET) as JwtPayload;
    const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [decoded.id]);
    const user = rows[0] as User;

    if (!user || user.refresh_token !== token) {
      return res.status(403).json({ error: "Invalid refresh token" });
    }

    const newAccessToken = generateAccessToken(user);
    res.json({ accessToken: newAccessToken });
  } catch (err) {
    res.status(403).json({ error: "Invalid or expired refresh token" });
  }
});

//  Logout
router.post("/logout", async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken;
  if (token) {
    try {
      const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET) as JwtPayload;
      await pool.query("UPDATE users SET refresh_token = NULL WHERE id = $1", [decoded.id]);
    } catch {}
  }

  res.clearCookie("refreshToken", { path: "/api/auth/refresh-token" });
  res.sendStatus(204);
});

// Get All Users
router.get("/users", async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query("SELECT * FROM users");
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
