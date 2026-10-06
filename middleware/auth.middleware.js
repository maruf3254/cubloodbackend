import AppError from "../utils/error.utils.js";
import jwt from "jsonwebtoken";
import userModel from "../models/user.model.js";
// import examModel from "../models/exam.model.js";

const isLoggedIn = async (req, res, next) => {
  const { token } = req.cookies;

  if (!token) {
    return next(new AppError("Unauthenticated, please login again", 400));
  }

  const userDetails = await jwt.verify(token, process.env.JWT_SECRET);
  req.user = userDetails;

  next();
};

// authorised roles
const authorisedRoles =
  (...roles) =>
  async (req, res, next) => {
    const { id } = req.user;
    const user = await userModel.findById(id);
    // console.log();
    // console.log(req.user);
    const currentUserRoles = req.user.role;
    if (!roles.includes(currentUserRoles) || !(user.role === req.user.role)) {
      return next(
        new AppError("You do not have permission to access this routes", 403)
      );
    }
    next();
  };

// const authorizeSubscriber = async (req, res, next) => {
//   const { role, id } = req.user;
//   const user = await userModel.findById(id);
//   const subscriptionStatus = user.subscription.status;
//   if (role !== "ADMIN" && subscriptionStatus !== "active") {
//     return next(new AppError("Please subscribce to access this route!", 403));
//   }

//   next();
// };

const authorizeSubscriber = async (req, res, next) => {
  try {
    const { role, id } = req.user; // Extract user role and ID from the request
    const { catId, examId } = req.params; // Extract exam ID from the request parameters

    // console.log("exam", examId);
    // console.log("catId", catId);

    // Find the exam by ID
    // const exam = await examModel.findById(examId);
    // console.log(exam);

    // if (!exam) {
    //   return next(new AppError("Exam not found", 404));
    // }

    // // Allow any user to access if the exam price is 0
    // if (exam.free) {
    //   return next();
    // }

    // Find the user and check their subscription
    const user = await userModel.findById(id).select("subscribe");

    // If the user is an admin or is subscribed to the exam, grant access
    if (
      role === "ADMIN" ||
      role === "INSTRUCTOR" ||
      user.subscribe.includes(catId)
    ) {
      return next();
    }

    // Otherwise, deny access
    return next(new AppError("Please subscribe to access this route!", 403));
  } catch (err) {
    return next(new AppError("Server error", 500));
  }
};

export { isLoggedIn, authorisedRoles, authorizeSubscriber };
