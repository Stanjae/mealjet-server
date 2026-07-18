import { Router } from "express";
import { body } from "express-validator";
import { validate } from "@shared/middleware/validate.middleware.js";
import {
  authenticate,
  isAuthenticatedMiddleware,
} from "@shared/middleware/auth.middleware.js";
import * as authController from "./auth.controller";
import { UserRole } from "@shared/types/enums";

const router = Router();

router.post(
  "/register",
  [
    body("username").trim().notEmpty().withMessage("Username is required"),
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email required"),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters"),
    body("role").isIn(Object.values(UserRole)).withMessage("Invalid role"),
  ],
  validate,
  authController.register,
);

router.get("/verify-email", authController.verifyEmail);

router.get("/verify-now", authController.verifyNow);

router.post(
  "/login",
  [body("email").isEmail().normalizeEmail(), body("password").notEmpty()],
  validate,
  authController.login,
);

router.get(
  "/refresh",
  isAuthenticatedMiddleware,
  authController.isAuthenticated,
);

router.get("/is-authenticated", authenticate, authController.isAuthenticated);

router.post("/logout", authenticate, authController.logout);

router.patch(
  "/update-user-profile",
  authenticate,
  authController.updateUserProfile,
);

router.patch(
  "/update-user-current-address",
  authenticate,
  authController.updateUserCurrentAddress,
);

router.delete(
  "/delete-user-address/:addressId",
  authenticate,
  authController.deleteUserAddress,
);

export default router;
