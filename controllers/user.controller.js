



import userModel from "../models/user.model.js";
import studentInfoModel from "../models/student_info.model.js";

import jwt from "jsonwebtoken";
import crypto from "crypto";
import bcrypt from "bcrypt";

import AppError from "../utils/error.utils.js";
import sendEmail from "../utils/sendEmail.js";


// =====================================================
// COOKIE OPTIONS
// =====================================================

const cookieOptions = {
  httpOnly: true,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  secure: true,
  sameSite: "none",
};


// =====================================================
// HELPER
// =====================================================

const getMyStudentId = (req) => {
  return req.user?.student_id;
};


// =====================================================
// REGISTER USER + DONOR
// =====================================================
// Student ID + Name must match StudentInfo.
// Once registered, the user is automatically a donor.
// No separate donor registration is required.
// =====================================================

export const register = async (req, res, next) => {
  try {
    const {
      student_id,
      fullName,
      email,
      password,
      phone,
      blood_group,
      location,
      name_visible,
      phone_visible,
    } = req.body;

    // -------------------------------------------------
    // Validate required fields
    // -------------------------------------------------

    if (
      !student_id ||
      !fullName ||
      !email ||
      !password ||
      !phone ||
      !blood_group ||
      !location
    ) {
      return next(
        new AppError("Please provide all required fields", 400)
      );
    }

    const trimmedStudentId = student_id.trim();
    const trimmedName = fullName.trim();
    const normalizedEmail = email.toLowerCase().trim();

    // -------------------------------------------------
    // Verify student from official StudentInfo collection
    // Student ID + partial/full name
    // -------------------------------------------------

    const escapedName = trimmedName.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );



    const student = await studentInfoModel.findOne({
      student_id: trimmedStudentId,
      name: {
        $regex: escapedName,
        $options: "i",
      },
    });

    console.log("Entered name:", trimmedName);
    console.log("Official student name:", student.name);

    if (!student) {
      return next(
        new AppError(
          "Student ID and name do not match our student records",
          400
        )
      );
    }

    // -------------------------------------------------
    // Check existing account
    // -------------------------------------------------

    const userExist = await userModel.findOne({
      $or: [
        { email: normalizedEmail },
        { student_id: trimmedStudentId },
      ],
    });

    if (userExist) {
      return next(
        new AppError(
          "An account already exists with this email or Student ID",
          409
        )
      );
    }

    // -------------------------------------------------
    // Create User
    // -------------------------------------------------

    const user = await userModel.create({
      // Official Student ID
      student_id: student.student_id,

      // IMPORTANT:
      // Save the official full name from StudentInfo
      // instead of the name entered by the user
      fullName: student.name,

      // Account information
      email: normalizedEmail,
      password,
      phone,

      // Official department from StudentInfo
      dept: student.dept,

      // -------------------------------------------------
      // Donor information
      // Every registered USER automatically becomes a donor
      // -------------------------------------------------

      blood_group,
      location,

      name_visible:
        name_visible !== undefined
          ? Boolean(name_visible)
          : true,

      phone_visible:
        phone_visible !== undefined
          ? Boolean(phone_visible)
          : false,

      available: true,
      is_active: true,

      last_donation_date: null,
      total_donations: 0,

      // -------------------------------------------------
      // Role
      // -------------------------------------------------

      role: "DONOR",
    });

    // -------------------------------------------------
    // Password is select:false
    // Keep this as an additional safety measure
    // -------------------------------------------------

    user.password = undefined;

    // -------------------------------------------------
    // Generate JWT
    // -------------------------------------------------

    const token = user.generateJWTToken();

    // -------------------------------------------------
    // Set authentication cookie
    // -------------------------------------------------

    res.cookie("token", token, cookieOptions);

    // -------------------------------------------------
    // Response
    // -------------------------------------------------

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      user,
    });
  } catch (error) {
    return next(error);
  }
};


// =====================================================
// LOGIN
// =====================================================

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(
        new AppError("Email and password are required", 400)
      );
    }

    const user = await userModel
      .findOne({
        email: email.toLowerCase().trim(),
      })
      .select("+password");

    if (!user) {
      return next(new AppError("Invalid email or password", 401));
    }

    const isPasswordCorrect = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordCorrect) {
      return next(new AppError("Invalid email or password", 401));
    }

    user.password = undefined;

    const token = user.generateJWTToken();

    res.cookie("token", token, cookieOptions);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user,
    });
  } catch (error) {
    return next(error);
  }
};


// =====================================================
// LOGOUT
// =====================================================

export const logout = async (req, res, next) => {
  try {
    res.cookie("token", "", {
      ...cookieOptions,
      maxAge: 0,
    });

    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    return next(error);
  }
};


// =====================================================
// GET MY PROFILE
// =====================================================

export const getProfile = async (req, res, next) => {
  try {
    const user = await userModel
      .findById(req.user.id)
      .select("-password");

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    return next(error);
  }
};


// =====================================================
// VERIFY STUDENT
// =====================================================
// Optional endpoint before registration.
// Frontend can use this to verify Student ID + Name.
// =====================================================
export const verifyStudent = async (req, res, next) => {
  try {
    const { student_id, name } = req.body;

    if (!student_id || !name) {
      return next(
        new AppError(
          "Student ID and name are required",
          400
        )
      );
    }

    const trimmedStudentId = student_id.trim();
    const trimmedName = name.trim();

    if (!trimmedStudentId || !trimmedName) {
      return next(
        new AppError(
          "Student ID and name are required",
          400
        )
      );
    }

    // Escape regex special characters
    const escapedName = trimmedName.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    const student = await studentInfoModel.findOne({
      student_id: trimmedStudentId,
      name: {
        $regex: escapedName,
        $options: "i",
      },
    });

    if (!student) {
      return next(
        new AppError(
          "Student ID and name do not match our records",
          404
        )
      );
    }

    return res.status(200).json({
      success: true,
      message: "Student verified successfully",

      student: {
        student_id: student.student_id,
        name: student.name,
        dept: student.dept,
      },
    });
  } catch (error) {
    return next(error);
  }
};

// =====================================================
// UPDATE USER PROFILE
// =====================================================

export const updateUser = async (req, res, next) => {
  try {
    const userId = req.params.id;

    const user = await userModel.findById(userId);

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    // Only owner can update own profile
    if (
      req.user.id.toString() !== user._id.toString() &&
      req.user.role !== "ADMIN"
    ) {
      return next(
        new AppError("You are not authorized to update this profile", 403)
      );
    }

    const allowedFields = [
      "fullName",
      "phone",
      "avatar",
      "blood_group",
      "last_donation_date",
      "total_donations",
      "location",
      "name_visible",
      "phone_visible",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field];
      }
    });

    await user.save();

    user.password = undefined;

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user,
    });
  } catch (error) {
    return next(error);
  }
};







// =====================================================
// CHANGE PASSWORD
// =====================================================

export const changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return next(
        new AppError(
          "Old password and new password are required",
          400
        )
      );
    }

    const user = await userModel
      .findById(req.user.id)
      .select("+password");

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    const isCorrect = await bcrypt.compare(
      oldPassword,
      user.password
    );

    if (!isCorrect) {
      return next(
        new AppError("Old password is incorrect", 400)
      );
    }

    user.password = newPassword;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    return next(error);
  }
};


// =====================================================
// FORGOT PASSWORD
// =====================================================

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return next(new AppError("Email is required", 400));
    }

    const user = await userModel.findOne({
      email: email.toLowerCase().trim(),
    });

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    const resetToken = await user.generatePasswordResetToken();

    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.CLIENT_URL}/user/profile/reset-password/${resetToken}`;

    const subject = "Password Reset Request";

    const message = `
      <h2>Password Reset</h2>
      <p>You requested to reset your password.</p>
      <p>
        Click the following link to reset your password:
      </p>
      <a href="${resetUrl}">
        Reset Password
      </a>
      <p>This link will expire in 15 minutes.</p>
    `;

    await sendEmail({
      email: user.email,
      subject,
      message,
    });

    return res.status(200).json({
      success: true,
      message: "Password reset link sent to your email",
    });
  } catch (error) {
    return next(error);
  }
};


// =====================================================
// RESET PASSWORD
// =====================================================

export const resetPassword = async (req, res, next) => {
  try {
    const { resetToken } = req.params;
    const { password } = req.body;

    if (!password) {
      return next(new AppError("New password is required", 400));
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    const user = await userModel
      .findOne({
        forgotPasswordToken: hashedToken,
        forgotPasswordExpiry: {
          $gt: Date.now(),
        },
      })
      .select("+password");

    if (!user) {
      return next(
        new AppError(
          "Reset token is invalid or expired",
          400
        )
      );
    }

    user.password = password;
    user.forgotPasswordToken = undefined;
    user.forgotPasswordExpiry = undefined;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    return next(error);
  }
};


// =====================================================
// DONOR PROFILE
// =====================================================
// Donor = User.
// There is NO separate donor model.
// =====================================================

// export const getMyDonorProfile = async (req, res, next) => {
//   try {
//     const user = await userModel
//       .findById(req.user.id)
//       .select("-password");

//     if (!user) {
//       return next(new AppError("User not found", 404));
//     }

//     return res.status(200).json({
//       success: true,
//       donor: user,
//     });
//   } catch (error) {
//     return next(error);
//   }
// };


// =====================================================
// UPDATE DONOR INFORMATION
// =====================================================

// export const updateDonor = async (req, res, next) => {
//   try {
//     const user = await userModel.findById(req.user.id);

//     if (!user) {
//       return next(new AppError("User not found", 404));
//     }

//     const {
//       blood_group,
//       location,
//       name_visible,
//       phone_visible,
//       last_donation_date,
//       total_donations,
//     } = req.body;

//     if (blood_group !== undefined) {
//       user.blood_group = blood_group;
//     }

//     if (location !== undefined) {
//       user.location = location;
//     }

//     if (name_visible !== undefined) {
//       user.name_visible = name_visible;
//     }

//     if (phone_visible !== undefined) {
//       user.phone_visible = phone_visible;
//     }

//     if (last_donation_date !== undefined) {
//       user.last_donation_date = last_donation_date;
//     }

//     if (total_donations !== undefined) {
//       user.total_donations = total_donations;
//     }

//     await user.save();

//     user.password = undefined;

//     return res.status(200).json({
//       success: true,
//       message: "Donor profile updated successfully",
//       donor: user,
//     });
//   } catch (error) {
//     return next(error);
//   }
// };


// =====================================================
// UPDATE DONOR AVAILABILITY
// =====================================================

export const updateAvailability = async (req, res, next) => {
  try {
    const { available } = req.body;

    if (typeof available !== "boolean") {
      return next(
        new AppError(
          "Available must be true or false",
          400
        )
      );
    }

    const user = await userModel.findById(req.user.id);

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    user.available = available;

    await user.save();

    return res.status(200).json({
      success: true,
      message: available
        ? "You are now available for blood donation"
        : "You are now unavailable for blood donation",
      available: user.available,
    });
  } catch (error) {
    return next(error);
  }
};


// =====================================================
// CHANGE DONOR PASSWORD
// =====================================================
// Same User password.
// This is kept as an alias if frontend wants /password.
// =====================================================

export const changeDonorPassword = async (req, res, next) => {
  return changePassword(req, res, next);
};


// =====================================================
// SEARCH DONORS
// =====================================================
// Only users who are active + available are returned.
// =====================================================

// export const searchDonors = async (req, res, next) => {
//   try {
//     const { student_id, name } = req.query;

//     // =====================================================
//     // 1. STUDENT ID + NAME REQUIRED
//     // =====================================================

//     if (!student_id || !name) {
//       return next(
//         new AppError(
//           "Student ID and name are required",
//           400
//         )
//       );
//     }

//     const trimmedStudentId = student_id.trim();
//     const trimmedName = name.trim();

//     if (!trimmedStudentId || !trimmedName) {
//       return next(
//         new AppError(
//           "Student ID and name are required",
//           400
//         )
//       );
//     }

//     // =====================================================
//     // 2. ESCAPE REGEX
//     // =====================================================

//     const escapedName = trimmedName.replace(
//       /[.*+?^${}()|[\]\\]/g,
//       "\\$&"
//     );

//     // =====================================================
//     // 3. VERIFY STUDENT
//     // =====================================================
//     // Student ID = exact match
//     // Name = partial match
//     //
//     // Example:
//     // Official name: "Md Maruf Hossain"
//     //
//     // "Maruf"       -> match
//     // "Hossain"     -> match
//     // "Md Maruf"    -> match
//     // "maruf"       -> match
//     // =====================================================

//     const student = await studentInfoModel.findOne({
//       student_id: trimmedStudentId,
//       name: {
//         $regex: escapedName,
//         $options: "i",
//       },
//     });

//     if (!student) {
//       return next(
//         new AppError(
//           "Student ID and name do not match our records",
//           404
//         )
//       );
//     }

//     // =====================================================
//     // 4. FIND AVAILABLE DONORS
//     // =====================================================

//     const donors = await userModel
//       .find({
//         role: "DONOR",
//         is_active: true,
//         available: true,
//       })
//       .select(
//         "fullName phone student_id dept blood_group location name_visible phone_visible last_donation_date total_donations"
//       )
//       .lean();

//     // =====================================================
//     // 5. APPLY DONOR PRIVACY
//     // =====================================================

//     const publicDonors = donors.map((donor) => {
//       const donorData = {
//         ...donor,
//       };

//       // MongoDB ID hide
//       delete donorData._id;

//       // Donor name hide if disabled
//       if (!donorData.name_visible) {
//         delete donorData.fullName;
//       }

//       // Donor phone hide if disabled
//       if (!donorData.phone_visible) {
//         delete donorData.phone;
//       }

//       return donorData;
//     });

//     // =====================================================
//     // 6. RESPONSE
//     // =====================================================

//     return res.status(200).json({
//       success: true,

//       message: "Student verified and donors found",

//       verifiedStudent: {
//         student_id: student.student_id,
//         name: student.name,
//         dept: student.dept,
//       },

//       count: publicDonors.length,

//       donors: publicDonors,
//     });
//   } catch (error) {
//     return next(error);
//   }
// };



export const searchDonors = async (req, res, next) => {
  try {
    const { student_id, name } = req.query;

    // Step 1: Validate input
    if (
      typeof student_id !== "string" ||
      typeof name !== "string" ||
      !student_id.trim() ||
      !name.trim()
    ) {
      return next(
        new AppError("Student ID and name are required", 400)
      );
    }

    const trimmedStudentId = student_id.trim();
    const trimmedName = name.trim();

    // Step 2: Normalize names
    const normalizeName = (value = "") =>
      value.trim().replace(/\s+/g, " ").toLowerCase();

    const normalizedInputName = normalizeName(trimmedName);

    // Step 3: Find student by exact student ID
    const student = await studentInfoModel.findOne({
      student_id: trimmedStudentId,
    });

    if (!student) {
      return next(
        new AppError(
          "Student ID and name do not match our records",
          404
        )
      );
    }

    // Step 4: Match a complete name word or the full name
    const normalizedStoredName = normalizeName(student.name);
    const nameParts = normalizedStoredName.split(" ");

    const isNameMatched =
      normalizedInputName === normalizedStoredName ||
      nameParts.includes(normalizedInputName);

    if (!isNameMatched) {
      return next(
        new AppError(
          "Student ID and name do not match our records",
          404
        )
      );
    }

    // Step 5: Fetch active and available donors
    const donors = await userModel
      .find({
        role: "DONOR",
        is_active: true,
        available: true,
      })
      .select(
        "fullName phone student_id dept blood_group location name_visible phone_visible last_donation_date total_donations"
      )
      .lean();

    // Step 6: Respect donor privacy settings
    const publicDonors = donors.map((donor) => {
      const donorData = { ...donor };

      delete donorData._id;

      if (!donorData.name_visible) {
        delete donorData.fullName;
      }

      if (!donorData.phone_visible) {
        delete donorData.phone;
      }

      return donorData;
    });

    // Step 7: Send response
    return res.status(200).json({
      success: true,
      message: "Student verified and donors found",
      verifiedStudent: {
        student_id: student.student_id,
        name: student.name,
        dept: student.dept,
      },
      count: publicDonors.length,
      donors: publicDonors,
    });
  } catch (error) {
    return next(error);
  }
};



// =====================================================
// GET AVAILABLE DONORS
// =====================================================

export const getAvailableDonors = async (req, res, next) => {
  try {
    const {
      blood_group,
      dept,
    } = req.query;

    const filter = {
      role: "USER",
      is_active: true,
      available: true,
    };

    if (blood_group) {
      filter.blood_group = blood_group;
    }

    if (dept) {
      filter.dept = {
        $regex: dept,
        $options: "i",
      };
    }

    const donors = await userModel
      .find(filter)
      .select(
        "fullName phone dept blood_group location name_visible phone_visible last_donation_date total_donations"
      );

    const publicDonors = donors.map((donor) => {
      const data = donor.toObject();

      if (!data.name_visible) {
        delete data.fullName;
      }

      if (!data.phone_visible) {
        delete data.phone;
      }

      return data;
    });

    return res.status(200).json({
      success: true,
      count: publicDonors.length,
      donors: publicDonors,
    });
  } catch (error) {
    return next(error);
  }
};


// =====================================================
// DEACTIVATE DONOR
// =====================================================

export const deactivateDonor = async (req, res, next) => {
  try {
    const user = await userModel.findById(req.user.id);

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    user.is_active = false;
    user.available = false;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Donor account deactivated successfully",
    });
  } catch (error) {
    return next(error);
  }
};

