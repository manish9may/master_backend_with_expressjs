import vine from "@vinejs/vine";

import { CustomErrorReporter } from "./customErrorReporter.js";

vine.errorReporter = () => new CustomErrorReporter();

export const registerSchema = vine.object({
  name: vine.string().minLength(5).maxLength(150),
  email: vine.string().email(),
  password: vine.string().minLength(5).confirmed(),
});

export const loginSchema = vine.object({
  email: vine.string().email(),
  password: vine.string(),
});
