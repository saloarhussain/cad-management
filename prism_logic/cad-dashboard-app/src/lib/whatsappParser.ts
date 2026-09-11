import JSZip from 'jszip';

export interface ChatMessage {
  id: string;
  date: string;
  time: string;
  timestamp: number;
  sender: string;
  text: string;
  banglishText?: string;
  isSystem?: boolean;
  mediaType?: 'image' | 'video' | 'audio' | 'document' | 'sticker' | null;
}

export interface ParsedChat {
  messages: ChatMessage[];
  participants: string[];
  chatTitle: string;
}

// Common media omitted indicators in various languages
const MEDIA_PATTERNS = [
  { type: 'image' as const, regex: /<(?:Media omitted|image omitted|foto omitida|bild weggelassen)>/i },
  { type: 'video' as const, regex: /<(?:video omitted|vídeo omitido)>/i },
  { type: 'audio' as const, regex: /<(?:audio omitted|voice message|PTT-\d+)>/i },
  { type: 'sticker' as const, regex: /<(?:sticker omitted|figurinha omitida)>/i },
  { type: 'document' as const, regex: /<(?:document omitted|arquivo omitido)>/i },
];

/**
 * Parses raw WhatsApp exported text into structured ChatMessage objects.
 * Handles Android & iOS export formats (12-hour, 24-hour, with or without seconds).
 */
export function parseWhatsAppChat(rawText: string): ParsedChat {
  const lines = rawText.split(/\r?\n/);
  const messages: ChatMessage[] = [];
  const participantsSet = new Set<string>();

  // Regex patterns for line starters:
  // Android style: "25/03/2024, 14:32 - Sender: Message" or "3/25/24, 2:32 PM - Sender: Message"
  // Note: Supports dash with non-breaking spaces or regular spaces, and various date separators
  const androidRegex = /^(\d{1,4}[/.-]\d{1,2}[/.-]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap][Mm])?)\s*[-–—]\s*(.+)$/;

  // iOS style: "[25/03/2024, 14:32:15] Sender: Message" or "[3/25/24, 2:32:15 PM] Sender: Message"
  const iosRegex = /^\[(\d{1,4}[/.-]\d{1,2}[/.-]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap][Mm])?)\]\s*(.+)$/;

  let currentMessage: ChatMessage | null = null;
  let idCounter = 0;

  for (const line of lines) {
    const cleanLine = line.trim();
    if (!cleanLine && !currentMessage) continue;

    let match = cleanLine.match(androidRegex) || cleanLine.match(iosRegex);

    if (match) {
      // If we already had a message being constructed, push it
      if (currentMessage) {
        messages.push(currentMessage);
      }

      const datePart = match[1];
      const timePart = match[2];
      const rest = match[3];

      // Check if there is a "Sender: Message" separator
      // Note: System messages do NOT have a colon separating a sender, e.g.:
      // "Messages and calls are end-to-end encrypted..."
      const senderColonIndex = rest.indexOf(':');

      if (senderColonIndex !== -1) {
        const sender = rest.substring(0, senderColonIndex).trim();
        const text = rest.substring(senderColonIndex + 1).trim();

        participantsSet.add(sender);

        // Detect media tag
        let mediaType: ChatMessage['mediaType'] = null;
        for (const p of MEDIA_PATTERNS) {
          if (p.regex.test(text)) {
            mediaType = p.type;
            break;
          }
        }

        currentMessage = {
          id: `msg-${++idCounter}`,
          date: datePart,
          time: timePart,
          timestamp: Date.now() + idCounter, // fallback sequential timestamp
          sender,
          text,
          mediaType,
          isSystem: false,
        };
      } else {
        // System message (e.g. "You created group", "Encryption notice")
        currentMessage = {
          id: `msg-${++idCounter}`,
          date: datePart,
          time: timePart,
          timestamp: Date.now() + idCounter,
          sender: 'System',
          text: rest,
          isSystem: true,
        };
      }
    } else if (currentMessage) {
      // Continuation of a multiline message
      currentMessage.text += '\n' + line;
    }
  }

  // Push final message
  if (currentMessage) {
    messages.push(currentMessage);
  }

  const participants = Array.from(participantsSet);
  const chatTitle = participants.length > 2
    ? `Group Chat (${participants.length} participants)`
    : participants.length === 2
    ? `${participants[0]} & ${participants[1]}`
    : participants[0] || 'WhatsApp Chat';

  return {
    messages,
    participants,
    chatTitle,
  };
}

/**
 * Handles uploaded File: extracts .txt from .zip or reads .txt directly.
 */
export async function parseUploadedFile(file: File): Promise<ParsedChat> {
  const isZip = file.name.endsWith('.zip') || file.type.includes('zip');

  if (isZip) {
    const zip = new JSZip();
    const loadedZip = await zip.loadAsync(file);

    // Look for _chat.txt or any .txt file in the archive
    let txtFile = loadedZip.file('_chat.txt');
    if (!txtFile) {
      const allTxtFiles = loadedZip.file(/\.txt$/i);
      if (allTxtFiles.length > 0) {
        txtFile = allTxtFiles[0];
      }
    }

    if (!txtFile) {
      throw new Error('No WhatsApp .txt chat file found inside the uploaded ZIP archive.');
    }

    const textContent = await txtFile.async('string');
    return parseWhatsAppChat(textContent);
  } else {
    // Read as plain text
    const textContent = await file.text();
    return parseWhatsAppChat(textContent);
  }
}

/**
 * Sample pre-loaded chat for instant demo experience.
 */
export const SAMPLE_CHAT_TEXT = `25/03/2024, 10:15 AM - Rahul: Hey bro! Did you review the CAD model for the diamond ring?
25/03/2024, 10:16 AM - Tania: Yes, I checked the 3D viewport. The prong height is looking good now.
25/03/2024, 10:18 AM - Rahul: Great! Are we ready to send the final files to the client?
25/03/2024, 10:20 AM - Tania: Almost done. I am doing one last check on the micro-pave stones.
25/03/2024, 10:21 AM - Rahul: Okay cool. Can you export the 3DM and STL files before 3 PM?
25/03/2024, 10:22 AM - Tania: Sure! I will upload it using the PIN-protected transfer on CADONCE.
25/03/2024, 10:25 AM - Rahul: Perfect, thanks! The client will love this design.
25/03/2024, 10:26 AM - Tania: <Media omitted>
25/03/2024, 10:27 AM - Tania: Here is the screenshot preview of the rendered band.
25/03/2024, 10:28 AM - Rahul: Wow, this looks awesome. Let's wrap it up!`;
