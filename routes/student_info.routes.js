import { Router } from "express";

import {
  getAllStudents,
  getStudentFilterOptions,
} from "../controllers/student_info.controller.js";

import {
  authorisedRoles,
  isLoggedIn,
} from "../middleware/auth.middleware.js";

const router = Router();

router.get(
  "/all",
  isLoggedIn,
  authorisedRoles("ADMIN"),
  getAllStudents
);

router.get(
  "/filter-options",
  isLoggedIn,
  authorisedRoles("ADMIN"),
  getStudentFilterOptions
);

export default router;