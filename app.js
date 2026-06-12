const express = require('express');
const path = require('path');
const app = express();
const routes = require('./common/routes');
const { worker60s } = require('./common/worker');

worker60s();

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:3000,http://localhost:4500,http://localhost:7900").split(",");
  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  } else {
    res.header("Access-Control-Allow-Origin", allowedOrigins[0]);
  }
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers","Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie");
  res.header("Access-Control-Allow-Credentials", "true");
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// body parser
app.use(express.json({ limit: "50mb"}));
app.use(express.urlencoded({ extended: true, limit: "50mb"}));

app.use("/uploads", express.static(path.join(__dirname, 'uploads')));

app.use("/",routes);

app.listen(5100, "0.0.0.0", () => {
    console.log("Server running on port 5100");
});