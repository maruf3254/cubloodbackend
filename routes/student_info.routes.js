import { Router } from "express";

import {
  getAllStudents,
  getStudentFilterOptions, getSessionWiseStudents
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

// router.get(
//   "/session/:session",
//   getSessionWiseStudents
// );

export default router;