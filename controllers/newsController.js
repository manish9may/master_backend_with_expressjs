import vine, { errors } from "@vinejs/vine";
import { newsSchema } from "../validations/newsValidation.js";
import { imageValidator, removeImage, uploadImage } from "../utils/helper.js";
import prismaClient from "../db/db.config.js";
import NewsApiTransform from "../transform/newsApiTransform.js";
import redisCache from "../db/redis.config.js";
import logger from "../config/logger.js";
import { queue, queueName } from "../jobs/index.js";

class NewsController {
  static async index(req, res) {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    if (page <= 0) {
      page = 1;
    }
    if (limit <= 0 || limit > 100) {
      limit = 10;
    }
    const skip = (page - 1) * limit;

    const news = await prismaClient.news.findMany({
      take: limit,
      skip: skip,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profile: true,
          },
        },
      },
    });
    const newsTransform = news?.map((item) => NewsApiTransform.transform(item));

    const totalNews = await prismaClient.news.count();
    const totalPages = Math.ceil(totalNews / limit);

    return res.json({
      status: 200,
      news: newsTransform,
      metadata: {
        totalPages,
        currentPage: page,
        currentLimit: limit,
      },
    });
  }
  static async store(req, res) {
    try {
      const user = req.user;
      const body = req.body;
      const validator = vine.compile(newsSchema);
      const payload = await validator.validate(body);

      if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({
          errors: {
            image: "Image field is required.",
          },
        });
      }
      const image = req.files?.image;
      //   * Image custom validator
      const message = imageValidator(image?.size, image?.mimetype);
      if (message !== null) {
        return res.status(400).json({
          errors: {
            image: message,
          },
        });
      }

      //   * Image upload
      const imageName = uploadImage(image);
      payload.image = imageName;
      payload.user_id = user.id;

      const news = await prismaClient.news.create({
        data: payload,
      });
      logger.info(JSON.stringify(news));

      await queue.add(queueName, [{ ...news }]);
      redisCache.del("/api/news", (err) => {
        if (err) throw err;
      });

      return res.json({
        status: 200,
        message: "News created successfully!",
        news,
      });
    } catch (err) {
      logger.error(JSON.stringify(err.messages));
      if (err instanceof errors.E_VALIDATION_ERROR) {
        // console.log(error.messages);
        return res.status(400).json({ errors: err.messages });
      } else {
        return res.status(500).json({
          status: 500,
          message: "Something went wrong.Please try again.",
        });
      }
    }
  }
  static async show(req, res) {
    try {
      const { id } = req.params;
      const news = await prismaClient.news.findUnique({
        where: {
          id: Number(id),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              profile: true,
            },
          },
        },
      });
      const transFormNews = news ? NewsApiTransform.transform(news) : null;
      return res.json({ status: 200, news: transFormNews });
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Somrthing went wrong.please try again." });
    }
  }
  static async update(req, res) {
    try {
      const { id } = req.params;
      const user = req.user;
      const body = req.body;
      const news = await prismaClient.news.findUnique({
        where: {
          id: Number(id),
        },
      });
      if (user.id !== news.user_id) {
        return res.status(400).json({ message: "UnAtuhorized" });
      }
      const validator = vine.compile(newsSchema);
      const payload = await validator.validate(body);
      const image = req?.files?.image;

      if (image) {
        const message = imageValidator(image?.size, image?.mimetype);
        if (message !== null) {
          return res.status(400).json({
            errors: {
              image: message,
            },
          });
        }

        //   * Upload new image
        const imageName = uploadImage(image);
        payload.image = imageName;
        // * Delete old image
        removeImage(news.image);
      }

      await prismaClient.news.update({
        data: payload,
        where: {
          id: Number(id),
        },
      });

      return res.status(200).json({ message: "News updated successfully!" });
    } catch (err) {
      if (err instanceof errors.E_VALIDATION_ERROR) {
        // console.log(error.messages);
        return res.status(400).json({ errors: err.messages });
      } else {
        return res.status(500).json({
          status: 500,
          message: "Something went wrong.Please try again.",
        });
      }
    }
  }
  static async destroy(req, res) {
    try {
      const { id } = req.params;
      const user = req.user;
      const news = await prismaClient.news.findUnique({
        where: {
          id: Number(id),
        },
      });
      if (user.id !== news?.user_id) {
        return res.status(401).json({ message: "Un Authorized" });
      }

      // * Delete image from filesystem
      removeImage(news.image);
      await prismaClient.news.delete({
        where: {
          id: Number(id),
        },
      });
      return res.json({ message: "News deleted successfully!" });
    } catch (err) {
      return res.status(500).json({
        status: 500,
        message: "Something went wrong.Please try again.",
      });
    }
  }
}
export default NewsController;
