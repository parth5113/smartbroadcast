const { z } = require('zod');

const DEPARTMENTS = ['CSE', 'AIML', 'AIDS', 'ECE', 'ME', 'CE', 'EEE', 'IT', 'BioTech'];

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50).trim(),
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128),
  role: z.enum(['student', 'admin']).default('student'),
  year: z.number().int().min(1).max(4).optional().nullable(),
  department: z.enum(DEPARTMENTS).optional().nullable(),
  interests: z.array(z.string().trim().toLowerCase()).max(20).default([]),
}).refine(
  (data) => {
    if (data.role === 'student') return data.year != null && data.department != null;
    return true;
  },
  { message: 'Students must provide year and department', path: ['year'] }
);

const loginSchema = z.object({
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

module.exports = { registerSchema, loginSchema };
