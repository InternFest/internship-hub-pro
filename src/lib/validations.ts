import { z } from "zod";

// Common validation schemas

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Please enter a valid email address")
  .max(255, "Email must be less than 255 characters");

export const phoneSchema = z
  .string()
  .regex(/^[0-9]{10}$/, "Please enter a valid 10-digit phone number");

export const optionalPhoneSchema = z
  .string()
  .regex(/^[0-9]{10}$/, "Please enter a valid 10-digit phone number")
  .optional()
  .or(z.literal(""));

export const nameSchema = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(100, "Name must be less than 100 characters");

export const passwordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters")
  .max(128, "Password must be less than 128 characters");

export const requiredTextSchema = z
  .string()
  .trim()
  .min(1, "This field is required");

export const optionalTextSchema = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""));

export const urlSchema = z
  .string()
  .url("Please enter a valid URL")
  .optional()
  .or(z.literal(""));

export const dateSchema = z.string().min(1, "Date is required");

export const hoursSchema = z
  .string()
  .min(1, "Hours is required")
  .refine(
    (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0 && num <= 24;
    },
    { message: "Hours must be between 0 and 24" }
  );

// Leave request form schema
export const leaveRequestSchema = z.object({
  leaveDate: dateSchema,
  leaveType: z.enum(["sick", "casual"], {
    required_error: "Please select a leave type",
  }),
  reason: z
    .string()
    .trim()
    .min(10, "Reason must be at least 10 characters")
    .max(500, "Reason must be less than 500 characters"),
});

// Admin query form schema
export const adminQuerySchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title must be less than 100 characters"),
  category: z.enum(["course", "faculty", "schedule", "work", "other"], {
    required_error: "Please select a category",
  }),
  description: z
    .string()
    .trim()
    .min(20, "Description must be at least 20 characters")
    .max(1000, "Description must be less than 1000 characters"),
});

// Diary entry form schema
export const diaryEntrySchema = z.object({
  entryDate: dateSchema,
  title: optionalTextSchema,
  workDescription: z
    .string()
    .trim()
    .min(10, "Work description must be at least 10 characters")
    .max(2000, "Work description must be less than 2000 characters"),
  workSummary: optionalTextSchema,
  hoursWorked: hoursSchema,
  referenceLinks: optionalTextSchema,
  learningOutcome: optionalTextSchema,
  skillsGained: optionalTextSchema,
});

// Resource form schema
export const resourceSchema = z.object({
  batchId: z.string().min(1, "Please select a batch"),
  moduleNumber: z
    .string()
    .min(1, "Module number is required")
    .refine(
      (val) => {
        const num = parseInt(val);
        return !isNaN(num) && num >= 1 && num <= 50;
      },
      { message: "Module number must be between 1 and 50" }
    ),
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title must be less than 100 characters"),
  description: optionalTextSchema,
  resourceType: z.enum(["video", "text", "notes"], {
    required_error: "Please select a resource type",
  }),
  contentUrl: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  contentText: optionalTextSchema,
});

// Profile update schema
export const profileUpdateSchema = z.object({
  fullName: nameSchema,
  phone: optionalPhoneSchema,
  bio: z.string().max(500, "Bio must be less than 500 characters").optional(),
  linkedinUrl: urlSchema,
});

// Student profile schema
export const studentProfileSchema = z.object({
  usn: z
    .string()
    .trim()
    .min(3, "USN must be at least 3 characters")
    .max(20, "USN must be less than 20 characters")
    .optional()
    .or(z.literal("")),
  collegeName: z
    .string()
    .trim()
    .min(3, "College name must be at least 3 characters")
    .max(100, "College name must be less than 100 characters")
    .optional()
    .or(z.literal("")),
  branch: z.string().optional().or(z.literal("")),
  internshipRole: z.enum(["ai-ml", "java", "vlsi", "mern"]).optional(),
  skillLevel: z.enum(["beginner", "intermediate", "advanced"]).optional(),
});

// Project form schema
export const projectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Project name must be at least 3 characters")
    .max(100, "Project name must be less than 100 characters"),
  description: z
    .string()
    .trim()
    .min(10, "Description must be at least 10 characters")
    .max(500, "Description must be less than 500 characters")
    .optional()
    .or(z.literal("")),
});
