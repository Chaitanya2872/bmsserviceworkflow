import express, { Request, Response, NextFunction } from "express";
import passport from "passport";

const router = express.Router();

// Extend Express Request to include 'user'
interface AuthenticatedRequest extends Request {
  user?: any; // Replace `any` with your actual User type if available
}

// Home route
// router.get("/", (req: AuthenticatedRequest, res: Response) => {
//   res.render("index", { user: req.user });
// });

// Google Auth Route
router.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
  })
);

// Google Auth Callback
router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) return res.redirect("/dashboard");
    res.send({ user: req.user });
    // For production, you might want: res.redirect("https://your-frontend-url/dashboard");
  }
);

// Dashboard route
// router.get("/dashboard", (req: AuthenticatedRequest, res: Response) => {
//   if (!req.user) return res.redirect("/");
//   res.render("dashboard", { user: req.user });
//});

// Logout route
// router.get("/logout", (req: Request, res: Response, next: NextFunction) => {
//   req.logout((err) => {
//     if (err) return next(err);
//     res.redirect("/");
//   });
// });

export default router;
