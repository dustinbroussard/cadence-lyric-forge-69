import { z } from 'zod';

export const messageSchema = z.object({
  role: z.string(),
  content: z.string()
});

export const choiceSchema = z.object({
  message: messageSchema
});

export const chatResponseSchema = z.object({
  choices: z.array(choiceSchema)
});

export type ChatResponse = z.infer<typeof chatResponseSchema>;
