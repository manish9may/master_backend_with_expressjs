import vine, { errors } from "@vinejs/vine";
import { loginSchema, registerSchema } from "../validations/authValidation.js";

import bcrypt from "bcryptjs";
import prismaClient from "../db/db.config.js";
import jwt from "jsonwebtoken";

class AuthController {
  static async register(req, res) {
    try {
      const body = req.body;
      const validator = vine.compile(registerSchema);
      const payload = await validator.validate(body);

      const findUser = await prismaClient.users.findUnique({
        where: {
          email: payload.email,
        },
      });

      if (findUser) {
        return res
          .status(400)
          .json({ status: 500, message: "Already Existed User!" });
      }

      const hashedPassword = await bcrypt.hash(payload.password, 17);
      payload.password = hashedPassword;

      const user = await prismaClient.users.create({
        data: payload,
      });

      return res.json({ status: 200, message: "SUCCESS", user });
    } catch (err) {
      console.log(err);
      if (err instanceof errors.E_VALIDATION_ERROR) {
        console.log(err.messages);
        return res.status(400).json({ errors: err.messages });
      } else {
        return res
          .status(500)
          .json({ status: 500, message: "Somthing went wrong!" });
      }
    }
  }
  static async login(req, res) {
    try {
      const body = req.body;
      const validator = vine.compile(loginSchema);
      const payload = await validator.validate(body);

      const findUser = await prismaClient.users.findUnique({
        where: {
          email: payload.email,
        },
      });

      if (findUser) {
        const isPasswordValid = await bcrypt.compare(
          payload.password,
          findUser.password
        );
        if (!isPasswordValid) {
          return res.status(400).json({
            errors: {
              email: "Invalid Credentials.",
            },
          });
        }
      } else {
        return res.status(400).json({
          errors: {
            email: "No user found with this email.",
          },
        });
      }
      const payloadData = {
        id: findUser.id,
        name: findUser.name,
        email: findUser.email,
        profile: findUser.profile,
      };
      const token = jwt.sign(payloadData, process.env.JWT_SECRET, {
        expiresIn: "365d",
      });
      return res.json({
        message: "Logged in",
        access_token: `Bearer ${token}`,
      });
    } catch (err) {
      console.log(err);
      if (err instanceof errors.E_VALIDATION_ERROR) {
        console.log(err.messages);
        return res.status(400).json({ errors: err.messages });
      } else {
        return res
          .status(500)
          .json({ status: 500, message: "Somthing went wrong!" });
      }
    }
  }
}

export default AuthController;
