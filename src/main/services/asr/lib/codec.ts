/**
 * ASR Binary Codec
 *
 * Handles binary frame encoding/decoding for ASR WebSocket protocol.
 *
 * Protocol: [version(1)][type(1)][reserved(2)][data_size(4)][data]
 */

// ============= Constants =============

const HEADER_SIZE = 8;

/** Frame types */
export const FRAME_TYPE = {
  AUDIO_DATA: 0x01,
  TEXT_DATA: 0x02,
  HEARTBEAT: 0x03,
} as const;

// ============= Encoder =============

/**
 * Build binary frame for WebSocket transmission
 */
export function encodeAudioFrame(data: ArrayBuffer | Uint8Array): Buffer {
  const inputBuffer = data instanceof Uint8Array ? data : new Uint8Array(data);
  const dataSize = inputBuffer.length;
  const frame = Buffer.alloc(HEADER_SIZE + dataSize);

  // Version (1 byte) + Type (1 byte) + Reserved (2 bytes)
  frame.writeUInt8(1, 0); // version
  frame.writeUInt8(FRAME_TYPE.AUDIO_DATA, 1); // type = audio data
  frame.writeUInt16BE(0, 2); // reserved

  // Data size (4 bytes, big-endian)
  frame.writeUInt32BE(dataSize, 4);

  // Data
  frame.set(inputBuffer, HEADER_SIZE);

  return frame;
}

// ============= Decoder =============

/** Parsed frame structure */
export interface DecodedFrame {
  version: number;
  type: number;
  reserved: number;
  data: Buffer;
}

/**
 * Decode binary frame from WebSocket
 */
export function decodeFrame(buffer: Buffer): DecodedFrame | null {
  if (buffer.length < HEADER_SIZE) {
    return null;
  }

  const version = buffer.readUInt8(0);
  const type = buffer.readUInt8(1);
  const reserved = buffer.readUInt16BE(2);
  const dataSize = buffer.readUInt32BE(4);

  // Validate data size
  if (buffer.length < HEADER_SIZE + dataSize) {
    return null;
  }

  const data = buffer.subarray(HEADER_SIZE, HEADER_SIZE + dataSize);

  return {
    version,
    type,
    reserved,
    data,
  };
}

// ============= Transcript Parser =============

/**
 * Parse transcript response from ASR server
 * Server returns JSON string in text frame
 */
export function parseTranscriptResponse(data: string): {
  text: string;
  isFinal: boolean;
  timestamp: number;
} | null {
  try {
    const parsed = JSON.parse(data);
    return {
      text: parsed.text || "",
      isFinal: parsed.isFinal || false,
      timestamp: parsed.timestamp || Date.now(),
    };
  } catch {
    // Try to parse as plain text
    if (typeof data === "string" && data.length > 0) {
      return {
        text: data,
        isFinal: true,
        timestamp: Date.now(),
      };
    }
    return null;
  }
}

// ============= Validation =============

/**
 * Validate decoded frame
 */
export function isValidAudioFrame(frame: DecodedFrame): boolean {
  return frame.version === 1 && frame.type === FRAME_TYPE.AUDIO_DATA;
}

export function isValidTextFrame(frame: DecodedFrame): boolean {
  return frame.type === FRAME_TYPE.TEXT_DATA;
}
