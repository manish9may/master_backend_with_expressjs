import { Router } from "express";
import AuthController from "../controllers/authController.js";
import ProfileController from "../controllers/profileController.js";
import authMiddleware from "../middleware/authenticate.js";
import NewsController from "../controllers/newsController.js";
import redisCache from "../db/redis.config.js";

const route = Router();

route.post("/auth/register", AuthController.register);
route.post("/auth/login", AuthController.login);

route.get("/profile", authMiddleware, ProfileController.index);
route.put("/profile/:id", authMiddleware, ProfileController.update);

route.get("/news", redisCache.route(), NewsController.index);
route.post("/news", authMiddleware, NewsController.store);
route.get("/news/:id", NewsController.show);
route.put("/news/:id", authMiddleware, NewsController.update);
route.delete("/news/:id", authMiddleware, NewsController.destroy);

export default route;
