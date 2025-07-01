const express = require("express");
const passport = require("passport");
const router = express.Router();

router.get("/", (req, res) => {
  res.render("index", { user: req.user });
});

router.get("/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account"
  })
);

router.get("/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    res.redirect("http://localhost:3000/dashboard");
  }
);

router.get("/dashboard", (req, res) => {
  if (!req.user) return res.redirect("/");
  res.render("dashboard", { user: req.user });
});

router.get("/logout", (req, res) => {
  req.logout(() => {
    res.redirect("/");
  });
});

module.exports = router;