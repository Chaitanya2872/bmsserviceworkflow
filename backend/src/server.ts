import express, { Request, Response, NextFunction } from "express";
import session from "express-session";
import passport from "passport";
import path from "path";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config(); 


// Load environment variables
dotenv.config();

// Import Passport config (side-effect)
import "./middleware/passport";

// Import routes
import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";

const app = express();

// Optional view engine setup (if needed)
// app.set("view engine", "ejs");
// app.set("views", path.join(__dirname, "views"));

app.use(express.json());

// CORS configuration for frontend
app.use(
  cors({
    origin:"https://creative-dieffenbachia-24c882.netlify.app/",
  
    credentials: true,
  })
);

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      sameSite: "none", // Use "lax" or "strict" if not using cross-origin
      secure: process.env.NODE_ENV === "production", // true in production
    },
  })
);

// Initialize Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use("/", authRoutes);
app.use("/users", userRoutes);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
