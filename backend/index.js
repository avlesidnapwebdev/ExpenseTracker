require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const connectDB = require("./config/db.js");

// routes
const authRoutes = require("./routes/auth.js");
const expenseRoutes = require("./routes/expenses.js");
const incomeRoutes = require("./routes/incomes.js");
const reportsRoutes = require("./routes/reports.js");

const app = express();
connectDB();

// ---------- Middleware ----------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


const allowedOrigins =
  process.env.NODE_ENV === "production"
    ? [
        "https://expensestra.selvapandi.com",
        // "https://api-expenses.selvapandi.com",
      ]
    : [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:4000",
      ];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // Postman / server-to-server

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log("❌ CORS Blocked:", origin);
      return callback(new Error("Not allowed by CORS"));
    },

    credentials: true,

    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],

    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
      "Cache-Control",
      "Pragma",
      "Expires",
    ],
  }),
);

// preflight handle
app.options("*", cors());

// ---------- Static Uploads ----------
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ---------- Routes ----------
app.use("/api/auth", authRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/incomes", incomeRoutes);
app.use("/api/reports", reportsRoutes);

app.get("/", (req, res) =>
  res.json({ ok: true, env: process.env.NODE_ENV || "dev" }),
);
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// ---------- Start ----------
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
