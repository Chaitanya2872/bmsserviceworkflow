import express, { Request, Response } from "express";
import pool from "../config/db"; 


const router = express.Router();

// Get all users
router.get("/", async (req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT * FROM users");
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get user by ID
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT * FROM users WHERE id = $1", [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new user
router.post("/", async (req: Request, res: Response) => {
  const { name, email, profile_picture_url } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO users (name, email, profile_picture_url) VALUES ($1, $2, $3) RETURNING *",
      [name, email, profile_picture_url]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
