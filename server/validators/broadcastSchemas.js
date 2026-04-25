const { z } = require('zod');

const broadcastMessageSchema = z.object({
  message: z.string()
    .min(1, 'Message is required')
    .max(2000, 'Message too long (max 2000 chars)')
    .trim(),
});

// Validates AI output before it reaches the matching engine
const entitySchema = z.object({
  year: z.number().int().min(1).max(4).nullable(),
  department: z.string().nullable(),
  interests: z.array(z.string()).default([]),
  location: z.object({
    label: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    radiusKm: z.number().positive(),
  }).nullable(),
  urgency: z.enum(['low', 'medium', 'high']).default('medium'),
  summary: z.string().max(500).default(''),
}).passthrough();

const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

const profileSchema = z.object({
  name: z.string().min(2).max(50).trim().optional(),
  year: z.number().int().min(1).max(4).optional(),
  department: z.enum(['CSE', 'AIML', 'AIDS', 'ECE', 'ME', 'CE', 'EEE', 'IT', 'BioTech']).optional(),
  interests: z.array(z.string().trim().toLowerCase()).max(20).optional(),
});

const feedbackSchema = z.object({
  relevant: z.boolean(),
});

module.exports = { broadcastMessageSchema, entitySchema, locationSchema, profileSchema, feedbackSchema };
