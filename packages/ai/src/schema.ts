import { z } from "zod";

export const generatedStepSchema = z.object({
  target: z.string().min(1).nullable(),
  title: z.string().min(1).max(80),
  body: z.string().max(240).optional(),
});

export const generatedTourSchema = z.object({
  steps: z.array(generatedStepSchema).min(1).max(8),
});

export const targetDescriptorSchema = z.object({
  id: z.string().min(1).max(120),
  label: z.string().max(160).optional(),
  route: z.string().max(200).optional(),
});

export const askRequestSchema = z.object({
  question: z.string().min(1).max(500),
  manifest: z.array(targetDescriptorSchema).min(1).max(200),
});

export type GeneratedStep = z.infer<typeof generatedStepSchema>;
export type GeneratedTour = z.infer<typeof generatedTourSchema>;
export type AskRequest = z.infer<typeof askRequestSchema>;

export const recordedStepSchema = z.object({
  target: z.string().min(1),
  registered: z.boolean(),
  tag: z.string(),
  label: z.string().optional(),
  role: z.string().optional(),
  text: z.string().optional(),
  route: z.string().optional(),
});

export const recordingSchema = z.object({
  name: z.string().min(1).max(80),
  createdAt: z.number().optional(),
  steps: z.array(recordedStepSchema).min(1).max(20),
});

export const draftedCopySchema = z.object({
  steps: z.array(
    z.object({ title: z.string().min(1).max(80), body: z.string().max(240).optional() }),
  ),
});

export type RecordedStep = z.infer<typeof recordedStepSchema>;
export type Recording = z.infer<typeof recordingSchema>;
export type DraftedCopy = z.infer<typeof draftedCopySchema>;
