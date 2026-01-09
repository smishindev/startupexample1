/**
 * VTT Transcript Parser Utility
 * Extracts transcript segments from VTT (WebVTT) subtitle files
 */

import axios from 'axios';

export interface TranscriptSegment {
  startTime: number;
  endTime: number;
  text: string;
}

/**
 * Parse VTT transcript file from URL
 * @param transcriptUrl - URL to the VTT transcript file
 * @returns Array of transcript segments with timestamps and text
 */
export const parseVTTTranscript = async (transcriptUrl: string): Promise<TranscriptSegment[]> => {
  try {
    const response = await axios.get(transcriptUrl);
    const vttContent = response.data;
    
    const segments: TranscriptSegment[] = [];
    const lines = vttContent.split('\n');
    
    let i = 0;
    while (i < lines.length) {
      const line = lines[i].trim();
      
      // Check if this is a timestamp line (e.g., "00:00:01.000 --> 00:00:05.000")
      if (line.includes('-->')) {
        const [startStr, endStr] = line.split('-->').map((s: string) => s.trim());
        const startTime = parseVTTTimestamp(startStr);
        const endTime = parseVTTTimestamp(endStr);
        
        // Get the text (next non-empty line)
        i++;
        let text = '';
        while (i < lines.length && lines[i].trim() !== '') {
          text += (text ? ' ' : '') + lines[i].trim();
          i++;
        }
        
        if (text) {
          segments.push({ startTime, endTime, text });
        }
      }
      i++;
    }
    
    return segments;
  } catch (error) {
    console.error('Failed to parse VTT transcript:', error);
    return [];
  }
};

/**
 * Parse VTT timestamp string to seconds
 * Supports both HH:MM:SS.mmm and MM:SS.mmm formats
 * @param timestamp - VTT timestamp string
 * @returns Time in seconds
 */
const parseVTTTimestamp = (timestamp: string): number => {
  const parts = timestamp.split(':');
  if (parts.length === 3) {
    // HH:MM:SS.mmm format
    const hours = parseInt(parts[0]);
    const minutes = parseInt(parts[1]);
    const seconds = parseFloat(parts[2]);
    return hours * 3600 + minutes * 60 + seconds;
  } else if (parts.length === 2) {
    // MM:SS.mmm format
    const minutes = parseInt(parts[0]);
    const seconds = parseFloat(parts[1]);
    return minutes * 60 + seconds;
  }
  return 0;
};
