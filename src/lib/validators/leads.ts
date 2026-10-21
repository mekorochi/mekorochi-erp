import { z } from "zod/v4";

export const leadSchema = z.object({
  name: z.string().min(1, "Name is required"),
  company: z.string().optional(),
  role: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  source: z.enum(["MANUAL", "WEBSITE", "INSTAGRAM", "WHATSAPP", "META_ADS", "REFERRAL", "CORPORATE", "NETWORKING", "AMAZON", "OTHER"]).default("MANUAL"),
  sourceDetail: z.string().optional(),
  interest: z.string().optional(),
  estimatedValue: z.coerce.number().min(0).optional(),
  giftingOccasion: z.string().optional(),
  estimatedQty: z.coerce.number().int().min(0).optional(),
  desiredDate: z.coerce.date().optional(),
  assignedToId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  consent: z.boolean().default(false),
  notes: z.string().optional(),
});

export const leadActivitySchema = z.object({
  leadId: z.string().min(1),
  type: z.enum(["NOTE", "CALL", "EMAIL", "MEETING", "WHATSAPP", "FOLLOW_UP", "TASK", "STATUS_CHANGE"]),
  subject: z.string().optional(),
  notes: z.string().optional(),
  scheduledAt: z.coerce.date().optional(),
});

export const leadStatusUpdateSchema = z.object({
  status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL_SENT", "NEGOTIATION", "WON", "LOST"]),
  pipelineStage: z.string().optional(),
  lostReason: z.string().optional(),
});

export type LeadInput = z.infer<typeof leadSchema>;
export type LeadActivityInput = z.infer<typeof leadActivitySchema>;
