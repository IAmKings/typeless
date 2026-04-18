/**
 * ASR-related type definitions
 *
 * Uses Zod for runtime validation per project standards.
 */

import { z } from "zod";

// ============= Schemas =============

/** ASR WebSocket connection configuration */
export const asrConfigSchema = z.object({
  appKey: z.string().min(1, "appKey is required"),
  accessKey: z.string().min(1, "accessKey is required"),
  resourceId: z.string().min(1, "resourceId is required"),
  audioFormat: z.enum(["pcm", "wav", "opus"]).default("pcm"),
  sampleRate: z.union([z.literal(16000), z.literal(8000)]).default(16000),
});

/** Transcript result from ASR */
export const transcriptResultSchema = z.object({
  text: z.string(),
  isFinal: z.boolean(),
  timestamp: z.number(),
});

/** ASR error details */
export const asrErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});

/** Audio device info */
export const audioDeviceSchema = z.object({
  deviceId: z.string(),
  label: z.string(),
  isDefault: z.boolean(),
});

// ============= Type Exports =============

export type ASRConfig = z.infer<typeof asrConfigSchema>;
export type TranscriptResult = z.infer<typeof transcriptResultSchema>;
export type ASRError = z.infer<typeof asrErrorSchema>;
export type AudioDevice = z.infer<typeof audioDeviceSchema>;

/** Connection status */
export type ConnectionStatus = "connected" | "disconnected" | "connecting";

/** Audio level callback */
export interface AudioLevel {
  level: number; // 0-100
  timestamp: number;
}
