const express = require("express");
const session = require("express-session");
const passport = require("passport");
const path = require("path");
require("dotenv").config({ path: '/etc/secrets/.env' });
require("./middleware/passport");
const cors = require("cors");



const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.json());

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
}));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "secret",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use("/", authRoutes);
app.use("/users", userRoutes);

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});