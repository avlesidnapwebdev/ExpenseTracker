const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const User = require("../models/User");
const auth = require("../middleware/auth");
const sendMail = require("../config/mail");

const BASE_URL = process.env.BACKEND_URL || "http://localhost:5000";

/* =======================
   MULTER CONFIG
======================= */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, "..", "uploads");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, `avatar_${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
});

/* =======================
   REGISTER
======================= */
router.post("/register", upload.single("avatar"), async (req, res) => {
  try {
    let { name, email, password, currency } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ message: "All fields required" });

    email = email.toLowerCase().trim();

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ message: "User already exists" });

    const hashed = await bcrypt.hash(password, 10);

    const avatar = req.file ? `${BASE_URL}/uploads/${req.file.filename}` : null;

    const verifyToken = crypto.randomBytes(32).toString("hex");

    await User.create({
      name,
      email,
      password: hashed,
      avatar,
      currency: currency || "USD",
      emailVerified: false,
      verifyToken,
      verifyTokenExp: Date.now() + 24 * 60 * 60 * 1000,
    });

    const webLink = `${process.env.CLIENT_URL}/verify/${verifyToken}`;
    const mobileLink = `expensestracker://verify/${verifyToken}`;

    await sendMail(
      email,
      "Verify Your Expense Tracker Account",
      `
  <div style="
      font-family: Arial, sans-serif;
      max-width: 600px;
      margin: auto;
      padding: 20px;
      background: #f9fafb;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
  ">

    <h2 style="color:#111827; text-align:center;">
      Verify your email
    </h2>

    <p style="color:#374151; font-size:15px; text-align:center;">
      Hi ${name},<br/><br/>
      Please verify your account to continue using <b>Expense Tracker</b>.
    </p>

    <!-- WEB BUTTON -->
    <div style="margin-top:30px; text-align:center;">
      <p style="margin-bottom:10px; color:#6b7280;">
        Using Web Browser?
      </p>

      <a href="${webLink}"
        style="
          display:inline-block;
          padding:12px 24px;
          background:#6d28d9;
          color:white;
          text-decoration:none;
          border-radius:8px;
          font-weight:bold;
        ">
        Verify on Website
      </a>
    </div>

    <!-- SPACE BETWEEN BUTTONS -->
    <div style="height:30px;"></div>

    <!-- MOBILE BUTTON -->
    <div style="text-align:center;">
      <p style="margin-bottom:10px; color:#6b7280;">
        Using Mobile App?
      </p>

      <a href="${mobileLink}"
        style="
          display:inline-block;
          padding:12px 24px;
          background:#111827;
          color:white;
          text-decoration:none;
          border-radius:8px;
          font-weight:bold;
        ">
        Open in Mobile App
      </a>
    </div>

    <hr style="margin:30px 0; border:none; border-top:1px solid #e5e7eb;" />

    <p style="font-size:12px; color:#9ca3af; text-align:center;">
      If you didn’t create this account, you can safely ignore this email.
    </p>

  </div>
  `,
    );

    res.json({ message: "Registered! Check email to verify." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =======================
   VERIFY EMAIL
======================= */
router.get("/verify/:token", async (req, res) => {
  try {
    const user = await User.findOne({
      verifyToken: req.params.token,
      verifyTokenExp: { $gt: Date.now() },
    });

    if (!user) return res.status(400).send("Invalid or expired link");

    user.emailVerified = true;
    user.verifyToken = null;
    user.verifyTokenExp = null;
    await user.save();

    res.json({ message: "Email verified" });
  } catch {
    res.status(500).send("Server error");
  }
});

/**************** RESEND VERIFY *****************/
router.post("/resend-verify", async (req, res) => {
  try {
    let { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email required" });

    const user = await User.findOne({ email });
    if (!user) return res.json({ message: "Email sent if account exists" });

    if (user.emailVerified) return res.json({ message: "Already verified" });

    user.verifyToken = crypto.randomBytes(32).toString("hex");
    user.verifyTokenExp = Date.now() + 24 * 60 * 60 * 1000;
    await user.save();

    const webLink = `${process.env.CLIENT_URL}/verify/${verifyToken}`;
    const mobileLink = `expensestracker://verify/${verifyToken}`;

    await sendMail(
      email,
      "Verify Your Expense Tracker Account",
      `
  <div style="
      font-family: Arial, sans-serif;
      max-width: 600px;
      margin: auto;
      padding: 20px;
      background: #f9fafb;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
  ">

    <h2 style="color:#111827; text-align:center;">
      Verify your email
    </h2>

    <p style="color:#374151; font-size:15px; text-align:center;">
      Hi ${name},<br/><br/>
      Please verify your account to continue using <b>Expense Tracker</b>.
    </p>

    <!-- WEB BUTTON -->
    <div style="margin-top:30px; text-align:center;">
      <p style="margin-bottom:10px; color:#6b7280;">
        Using Web Browser?
      </p>

      <a href="${webLink}"
        style="
          display:inline-block;
          padding:12px 24px;
          background:#6d28d9;
          color:white;
          text-decoration:none;
          border-radius:8px;
          font-weight:bold;
        ">
        Verify on Website
      </a>
    </div>

    <!-- SPACE BETWEEN BUTTONS -->
    <div style="height:30px;"></div>

    <!-- MOBILE BUTTON -->
    <div style="text-align:center;">
      <p style="margin-bottom:10px; color:#6b7280;">
        Using Mobile App?
      </p>

      <a href="${mobileLink}"
        style="
          display:inline-block;
          padding:12px 24px;
          background:#111827;
          color:white;
          text-decoration:none;
          border-radius:8px;
          font-weight:bold;
        ">
        Open in Mobile App
      </a>
    </div>

    <hr style="margin:30px 0; border:none; border-top:1px solid #e5e7eb;" />

    <p style="font-size:12px; color:#9ca3af; text-align:center;">
      If you didn’t create this account, you can safely ignore this email.
    </p>

  </div>
  `,
    );

    res.json({ message: "Verification email sent" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

/**************** LOGIN (BLOCK IF NOT VERIFIED) *****************/
router.post("/login", async (req, res) => {
  try {
    let { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "Please enter all fields" });

    email = email.toLowerCase().trim();

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    if (!user.emailVerified)
      return res.status(403).json({ message: "Please verify your email" });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        currency: user.currency,
      },
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});

/**************** FORGOT → SEND OTP (UNCHANGED) *****************/
router.post("/forgot", async (req, res) => {
  try {
    let { email } = req.body;

    if (!email) return res.status(400).json({ message: "Email is required" });

    email = email.toLowerCase().trim();
    const user = await User.findOne({ email });

    if (!user) {
      console.log("⚠️ Forgot request for non-existing email:", email);
      return res.json({ message: "If email exists, OTP sent" });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    user.resetOtp = otp;
    user.resetOtpExp = Date.now() + 10 * 60 * 1000;
    await user.save();

    console.log("📨 Sending OTP to:", email);
    console.log("🔐 OTP:", otp);

    const sent = await sendMail(
      email,
      "Expense Tracker Password Reset OTP",
      `
        <h2>Your OTP Code</h2>
        <h1 style="letter-spacing:3px">${otp}</h1>
        <p>Expires in <b>10 minutes</b>.</p>
      `,
    );

    if (!sent) return res.status(500).json({ message: "Failed to send OTP" });

    return res.json({ message: "OTP sent successfully" });
  } catch (err) {
    console.log("❌ SERVER ERROR IN FORGOT ROUTE", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/**************** RESET PASSWORD (UNCHANGED) *****************/
router.post("/reset", async (req, res) => {
  try {
    let { email, otp, password, confirmPassword } = req.body;

    if (!email || !otp || !password || !confirmPassword)
      return res.status(400).json({ message: "All fields are required" });

    if (password !== confirmPassword)
      return res.status(400).json({ message: "Passwords do not match" });

    email = email.toLowerCase().trim();
    otp = String(otp).trim();

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid request" });

    if (!user.resetOtp || !user.resetOtpExp)
      return res.status(400).json({ message: "Request OTP again" });

    if (String(user.resetOtp) !== otp)
      return res.status(400).json({ message: "Invalid OTP" });

    if (Date.now() > user.resetOtpExp)
      return res.status(400).json({ message: "OTP expired" });

    user.password = await bcrypt.hash(password, 10);
    user.resetOtp = null;
    user.resetOtpExp = null;

    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});

/**************** PROFILE *****************/
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

/**************** GOOGLE LOGIN *****************/
router.post("/google", async (req, res) => {
  try {
    const { email, name, picture } = req.body;

    if (!email) return res.status(400).json({ message: "No email" });

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name,
        email,
        password: crypto.randomBytes(20).toString("hex"),
        avatar: picture || null,
        emailVerified: true,
      });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      },
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Google login failed" });
  }
});

/**************** UPDATE PROFILE *****************/
router.put("/profile", auth, upload.single("avatar"), async (req, res) => {
  try {
    const { name, currency } = req.body;

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (name) user.name = name;
    if (currency) user.currency = currency;

    if (req.file) {
      user.avatar = `${process.env.BACKEND_URL}/uploads/${req.file.filename}`;
    }

    await user.save();

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      currency: user.currency,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Profile update failed" });
  }
});

module.exports = router;
