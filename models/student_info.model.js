import { Schema, model } from "mongoose";

const studentInfoSchema = new Schema(
    {
        student_id: {
            type: String,
            required: true,
            trim: true,
            index: true,

        },
        dept: {
            type: String,
            required: true,
            trim: true,
            index: true,

        },
        name: {
            type: String,
            required: true,
            trim: true,
            index: true,

        },
    },
    {
        timestamps: true,
    }
);

export default model("StudentInfo", studentInfoSchema);