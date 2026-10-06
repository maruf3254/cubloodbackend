// import { Router } from "express";

// const router = Router();
// import {
//   register,
//   login,
//   logout,
//   getProfile,
//   forgotPassword,
//   resetPassword,
//   changePassword,
//   updateUser,
//   getAllUsers,
//   addSubscription,
//   makeAdorIN,
//   removeSubscription,
//   deleteUserAdmin,
//   getAllUserswithResult,
// } from "../controllers/user.controller.js";
// import { authorisedRoles, isLoggedIn } from "../middleware/auth.middleware.js";

// router.post("/register", register);
// router.post("/login", login);
// router.get("/logout", logout);
// router.get("/me", isLoggedIn, getProfile);
// router.get(
//   "/all",
//   isLoggedIn,
//   authorisedRoles("ADMIN", "INSTRUCTOR"),
//   getAllUsers
// );
// router.get(
//   "/allwithresult",
//   isLoggedIn,
//   authorisedRoles("ADMIN", "INSTRUCTOR"),
//   getAllUserswithResult
// );
// router.post(
//   "/addsubscription/:userId",
//   isLoggedIn,
//   authorisedRoles("ADMIN", "INSTRUCTOR"),
//   addSubscription
// );
// router.delete(
//   "/addsubscription/:userId",
//   isLoggedIn,
//   authorisedRoles("ADMIN", "INSTRUCTOR"),
//   removeSubscription
// );

// router.post("/reset", forgotPassword);
// router.post("/reset/:resetToken", resetPassword);
// router.post("/change-password", isLoggedIn, changePassword);
// router.post("/update/:id", isLoggedIn, updateUser);

// router.put(
//   "/:id/update-role",
//   isLoggedIn,
//   authorisedRoles("ADMIN"),
//   makeAdorIN
// );

// router.delete(
//   "/:id/delete-user",
//   isLoggedIn,
//   authorisedRoles("ADMIN"),
//   deleteUserAdmin
// );

// export default router;




import { Router } from "express";

import {
  register,
  login,
  logout,
  getProfile,
  forgotPassword,
  resetPassword,
  changePassword,
  updateUser,


  // Blood donor related functions
  // getMyDonorProfile,
  // updateDonor,
  updateAvailability,
  searchDonors,
  getAvailableDonors,
  deactivateDonor,
} from "../controllers/user.controller.js";

import {
  authorisedRoles,
  isLoggedIn,
} from "../middleware/auth.middleware.js";

const router = Router();

/*
|--------------------------------------------------------------------------
| Authentication
|--------------------------------------------------------------------------
*/

// Register User + Donor automatically
router.post("/register", register);

// Login
router.post("/login", login);

// Logout
router.get("/logout", logout);

// Logged-in user profile
router.get("/me", isLoggedIn, getProfile);





// Update Donor profile
router.post(
  "/update/:id",
  isLoggedIn,
  updateUser
);









/*
|--------------------------------------------------------------------------
| Password
|--------------------------------------------------------------------------
*/

// Forgot password
router.post(
  "/reset",
  forgotPassword
);

// Reset password using token
router.post(
  "/reset/:resetToken",
  resetPassword
);

// Change password while logged in
router.post(
  "/change-password",
  isLoggedIn,
  changePassword
);


/*
|--------------------------------------------------------------------------
| Blood Donor
|--------------------------------------------------------------------------
|
| No separate donor route.
| Every registered user is automatically a donor.
|
*/

// Get my donor profile
// router.get(
//   "/donor/profile",
//   isLoggedIn,
//   getMyDonorProfile
// );

// Update donor information
// router.put(
//   "/donor/profile",
//   isLoggedIn,
//   updateDonor
// );

// Update donor availability
router.put(
  "/donor/availability",
  isLoggedIn,
  updateAvailability
);

// Search available donors
router.get(
  "/donor/search",
  searchDonors
);

// Get all available donors
router.get(
  "/donor/available",
  isLoggedIn,
  getAvailableDonors
);

// Deactivate donor profile
router.delete(
  "/donor/deactivate",
  isLoggedIn,
  deactivateDonor
);


export default router;