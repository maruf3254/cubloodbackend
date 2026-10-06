import studentInfoModel from "../models/student_info.model.js";
import AppError from "../utils/error.utils.js";

const getSession = (studentId) => {
    if (!studentId || studentId.length < 2) return null;

    const prefix = Number(studentId.substring(0, 2));

    if (isNaN(prefix)) return null;

    return `${prefix - 1}-${prefix}`;
};

const getAllStudents = async (req, res, next) => {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);

        const limit = Math.min(
            Math.max(parseInt(req.query.limit) || 1000, 1),
            1000
        );

        const { dept, session, search } = req.query;

        // Base filter
        const filter = {
            student_id: {
                $exists: true,
                $regex: /^.{8,}$/,
            },
        };

        // Department filter
        if (dept && dept.trim() !== "") {
            filter.dept = dept.trim();
        }

        // Search filter
        if (search && search.trim() !== "") {
            const searchRegex = new RegExp(search.trim(), "i");

            filter.$or = [
                { student_id: searchRegex },
                { name: searchRegex },
                { dept: searchRegex },
            ];
        }

        /*
          Session filtering
    
          Example:
          17xxxxxx -> 16-17
          23xxxxxx -> 22-23
        */
        if (session && session.trim() !== "") {
            const sessionPrefix = session.split("-")[1];

            if (sessionPrefix && /^\d{2}$/.test(sessionPrefix)) {
                filter.student_id = {
                    $exists: true,
                    $regex: new RegExp(`^${sessionPrefix}.{6,}$`),
                };
            }
        }

        const skip = (page - 1) * limit;

        const [students, totalStudents] = await Promise.all([
            studentInfoModel
                .find(filter)
                .select("student_id dept name")
                .sort({ student_id: 1 })
                .skip(skip)
                .limit(limit)
                .lean(),

            studentInfoModel.countDocuments(filter),
        ]);

        // Add session to each student
        const studentsWithSession = students.map((student) => ({
            ...student,
            session: getSession(student.student_id),
        }));

        const totalPages = Math.ceil(totalStudents / limit);

        res.status(200).json({
            success: true,
            message: "Students fetched successfully",

            pagination: {
                currentPage: page,
                limit,
                totalStudents,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1,
            },

            filters: {
                search: search || "",
                department: dept || "",
                session: session || "",
            },

            students: studentsWithSession,
        });
    } catch (error) {
        return next(new AppError("Failed to fetch students", 500));
    }
};

const getStudentFilterOptions = async (req, res, next) => {
  try {
    const departments = await studentInfoModel.distinct("dept", {
      student_id: {
        $exists: true,
        $regex: /^.{8,}$/,
      },
    });

    const students = await studentInfoModel
      .find({
        student_id: {
          $exists: true,
          $regex: /^.{8,}$/,
        },
      })
      .select("student_id")
      .lean();

    const sessions = new Set();

    students.forEach((student) => {
      if (student.student_id?.length >= 2) {
        const prefix = Number(student.student_id.substring(0, 2));

        if (!isNaN(prefix)) {
          sessions.add(`${prefix - 1}-${prefix}`);
        }
      }
    });

    res.status(200).json({
      success: true,
      departments: departments.sort(),
      sessions: Array.from(sessions).sort(),
    });
  } catch (error) {
    return next(
      new AppError("Failed to fetch filter options", 500)
    );
  }
};

export { getAllStudents, getStudentFilterOptions };