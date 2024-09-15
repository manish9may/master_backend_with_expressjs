import express from "express";
import fileUpload from "express-fileupload";
import "dotenv/config";

import http from "http";

import ApiRoutes from "./routes/api.js";

import helmet from "helmet";
import cors from "cors";
import { limiter } from "./config/ratelimiter.js";

const app = express();

const PORT = process.env.PORT || 8000;

const server = http.createServer(app);

app.use(express.json());

app.use(express.urlencoded({ extended: false }));

app.use(express.static("public"));

app.use(fileUpload());

app.use(helmet());
app.use(cors());

app.use(limiter);

app.get("/", (req, res) => {
  res.json({ message: "Hello, it's working" });
});

app.use("/api", ApiRoutes);

import "./jobs/index.js";

server.listen(PORT, () => {
  console.log(`Server is running on :${PORT}`);
});
