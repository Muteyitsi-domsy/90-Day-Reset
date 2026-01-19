import type { MonthlySummaryData, AnnualRecapData, MoodContext, CategoryMoodData } from '../types';

// Standard pastel palette (soft sage/cream - neutral and calming)
const PALETTE = {
  bgFrom: '#fdfbf7',
  bgTo: '#e8f5e9',
  textPrimary: '#344e41',
  textSecondary: '#5a6c5a',
  accent: '#588157',
  cardBg: '#ffffff',
  cardBorder: '#d4e4d4',
  progressBg: '#e8f0e8',
  progressFill: '#7cb37c',
};

// Month names for display
const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Category labels for display
const CATEGORY_LABELS: Record<MoodContext, string> = {
  career: 'Career',
  family: 'Family',
  romantic: 'Romance',
  friendships: 'Friendships',
  physical_health: 'Physical Health',
  mental_health: 'Mental Health',
  spirituality: 'Spirituality',
};

// Category icons/emojis
const CATEGORY_ICONS: Record<MoodContext, string> = {
  career: '💼',
  family: '👨‍👩‍👧‍👦',
  romantic: '❤️',
  friendships: '👥',
  physical_health: '🏃',
  mental_health: '🧠',
  spirituality: '🙏',
};

// Create gradient background on canvas
function createGradientBackground(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, PALETTE.bgFrom);
  gradient.addColorStop(1, PALETTE.bgTo);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

// Draw rounded rectangle
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// Word wrap text
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  words.forEach(word => {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  });
  if (currentLine) lines.push(currentLine);

  return lines;
}

// Generate monthly summary image
export async function generateMonthlySummaryImage(data: MonthlySummaryData): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const width = 600;
  const height = 800;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Background gradient
  createGradientBackground(ctx, width, height);

  // Header section
  ctx.fillStyle = PALETTE.textSecondary;
  ctx.font = '18px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Monthly Mood Summary', width / 2, 50);

  // Month/Year title
  ctx.fillStyle = PALETTE.textPrimary;
  ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
  ctx.fillText(`${MONTH_NAMES[data.month]} ${data.year}`, width / 2, 100);

  // Large emoji
  ctx.font = '120px system-ui, -apple-system, sans-serif';
  ctx.fillText(data.moodEmoji, width / 2, 250);

  // "Mostly [Mood]" title
  ctx.fillStyle = PALETTE.textPrimary;
  ctx.font = 'bold 32px system-ui, -apple-system, sans-serif';
  ctx.fillText(`Mostly ${data.predominantMood}`, width / 2, 320);

  // Count info card
  const cardX = 50;
  const cardY = 360;
  const cardWidth = width - 100;
  const cardHeight = 60;

  ctx.fillStyle = PALETTE.cardBg;
  drawRoundedRect(ctx, cardX, cardY, cardWidth, cardHeight, 12);
  ctx.fill();
  ctx.strokeStyle = PALETTE.cardBorder;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = PALETTE.textSecondary;
  ctx.font = '18px system-ui, -apple-system, sans-serif';
  ctx.fillText(`Logged ${data.moodCount} times out of ${data.totalEntries} entries`, width / 2, cardY + 37);

  // Encouraging message
  ctx.fillStyle = PALETTE.textPrimary;
  ctx.font = 'italic 20px Georgia, serif';
  ctx.textAlign = 'center';

  const messageLines = wrapText(ctx, `"${data.encouragingMessage}"`, cardWidth - 40);
  let messageY = 480;
  messageLines.forEach(line => {
    ctx.fillText(line, width / 2, messageY);
    messageY += 30;
  });

  // Footer branding
  ctx.fillStyle = PALETTE.textSecondary;
  ctx.font = '14px system-ui, -apple-system, sans-serif';
  ctx.fillText('90 Day Reset • Mood Journal', width / 2, height - 40);

  // Convert to blob
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob!);
    }, 'image/png', 1.0);
  });
}

// Generate annual recap image
export async function generateAnnualRecapImage(data: AnnualRecapData): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const width = 600;
  const height = 900;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Background gradient
  createGradientBackground(ctx, width, height);

  // Celebration header
  ctx.font = '48px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🎉', width / 2, 60);

  ctx.fillStyle = PALETTE.textSecondary;
  ctx.font = '18px system-ui, -apple-system, sans-serif';
  ctx.fillText('Year in Review', width / 2, 100);

  // Year title
  ctx.fillStyle = PALETTE.textPrimary;
  ctx.font = 'bold 48px system-ui, -apple-system, sans-serif';
  ctx.fillText(data.year.toString(), width / 2, 160);

  // Stats card
  const statsCardX = 50;
  const statsCardY = 190;
  const statsCardWidth = width - 100;
  const statsCardHeight = 100;

  ctx.fillStyle = PALETTE.cardBg;
  drawRoundedRect(ctx, statsCardX, statsCardY, statsCardWidth, statsCardHeight, 12);
  ctx.fill();
  ctx.strokeStyle = PALETTE.cardBorder;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Stats inside card
  const statWidth = statsCardWidth / 3;
  ctx.textAlign = 'center';

  // Total entries
  ctx.fillStyle = PALETTE.accent;
  ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
  ctx.fillText(data.totalEntries.toString(), statsCardX + statWidth / 2, statsCardY + 45);
  ctx.fillStyle = PALETTE.textSecondary;
  ctx.font = '12px system-ui, -apple-system, sans-serif';
  ctx.fillText('Entries', statsCardX + statWidth / 2, statsCardY + 70);

  // Longest streak
  ctx.fillStyle = PALETTE.accent;
  ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
  ctx.fillText(data.longestStreak.toString(), statsCardX + statWidth + statWidth / 2, statsCardY + 45);
  ctx.fillStyle = PALETTE.textSecondary;
  ctx.font = '12px system-ui, -apple-system, sans-serif';
  ctx.fillText('Day Streak', statsCardX + statWidth + statWidth / 2, statsCardY + 70);

  // Most active month
  ctx.fillStyle = PALETTE.accent;
  ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
  ctx.fillText(data.mostActiveMonth.slice(0, 3), statsCardX + statWidth * 2 + statWidth / 2, statsCardY + 45);
  ctx.fillStyle = PALETTE.textSecondary;
  ctx.font = '12px system-ui, -apple-system, sans-serif';
  ctx.fillText('Most Active', statsCardX + statWidth * 2 + statWidth / 2, statsCardY + 70);

  // Top moods section
  ctx.fillStyle = PALETTE.textPrimary;
  ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Your Top Moods', statsCardX, statsCardY + 145);

  // Mood bars
  let barY = statsCardY + 175;
  const barHeight = 50;
  const barSpacing = 15;
  const maxBarWidth = statsCardWidth - 120;

  data.topMoods.forEach((mood, index) => {
    // Emoji
    ctx.font = '28px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(mood.emoji, statsCardX, barY + 30);

    // Emotion name
    ctx.fillStyle = PALETTE.textPrimary;
    ctx.font = '16px system-ui, -apple-system, sans-serif';
    ctx.fillText(mood.emotion, statsCardX + 45, barY + 20);

    // Count
    ctx.fillStyle = PALETTE.textSecondary;
    ctx.font = '12px system-ui, -apple-system, sans-serif';
    ctx.fillText(`${mood.count} entries`, statsCardX + 45, barY + 40);

    // Progress bar background
    const barX = statsCardX + 150;
    const barWidth = maxBarWidth * (mood.percentage / 100);

    ctx.fillStyle = PALETTE.progressBg;
    drawRoundedRect(ctx, barX, barY + 12, maxBarWidth, 26, 13);
    ctx.fill();

    // Progress bar fill
    if (barWidth > 26) {
      ctx.fillStyle = PALETTE.progressFill;
      drawRoundedRect(ctx, barX, barY + 12, barWidth, 26, 13);
      ctx.fill();
    }

    // Percentage
    ctx.fillStyle = PALETTE.textPrimary;
    ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${mood.percentage}%`, statsCardX + statsCardWidth, barY + 30);

    barY += barHeight + barSpacing;
  });

  // Congratulatory message
  const messageY = barY + 40;
  ctx.fillStyle = PALETTE.textPrimary;
  ctx.font = 'italic 18px Georgia, serif';
  ctx.textAlign = 'center';

  const message = 'Congrats for navigating emotional waters skilfully.\nLooking forward to the next year!';
  const messageLines = message.split('\n');
  messageLines.forEach((line, index) => {
    ctx.fillText(line, width / 2, messageY + index * 28);
  });

  // Footer branding
  ctx.fillStyle = PALETTE.textSecondary;
  ctx.font = '14px system-ui, -apple-system, sans-serif';
  ctx.fillText('90 Day Reset • Mood Journal', width / 2, height - 40);

  // Convert to blob
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob!);
    }, 'image/png', 1.0);
  });
}

// Trigger browser download for image
export function downloadImage(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Generate filename for monthly summary
export function getMonthlySummaryFilename(month: number, year: number): string {
  const monthName = MONTH_NAMES[month].toLowerCase();
  return `mood-summary-${monthName}-${year}.png`;
}

// Generate filename for annual recap
export function getAnnualRecapFilename(year: number): string {
  return `mood-recap-${year}.png`;
}

// Generate filename for category recap
export function getCategoryRecapFilename(year: number, category: MoodContext): string {
  return `mood-recap-${year}-${category.replace('_', '-')}.png`;
}

// Generate category-specific recap image
export async function generateCategoryRecapImage(
  year: number,
  category: MoodContext,
  categoryData: CategoryMoodData,
  totalYearEntries: number
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const width = 600;
  const height = 700;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Background gradient
  createGradientBackground(ctx, width, height);

  // Category icon header
  ctx.font = '48px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(CATEGORY_ICONS[category], width / 2, 60);

  // Category label
  ctx.fillStyle = PALETTE.textSecondary;
  ctx.font = '18px system-ui, -apple-system, sans-serif';
  ctx.fillText(`${CATEGORY_LABELS[category]} - Year in Review`, width / 2, 100);

  // Year title
  ctx.fillStyle = PALETTE.textPrimary;
  ctx.font = 'bold 48px system-ui, -apple-system, sans-serif';
  ctx.fillText(year.toString(), width / 2, 160);

  // Stats card
  const statsCardX = 50;
  const statsCardY = 190;
  const statsCardWidth = width - 100;
  const statsCardHeight = 80;

  ctx.fillStyle = PALETTE.cardBg;
  drawRoundedRect(ctx, statsCardX, statsCardY, statsCardWidth, statsCardHeight, 12);
  ctx.fill();
  ctx.strokeStyle = PALETTE.cardBorder;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Stats inside card
  const statWidth = statsCardWidth / 2;
  ctx.textAlign = 'center';

  // Category entries
  ctx.fillStyle = PALETTE.accent;
  ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
  ctx.fillText(categoryData.totalEntries.toString(), statsCardX + statWidth / 2, statsCardY + 40);
  ctx.fillStyle = PALETTE.textSecondary;
  ctx.font = '12px system-ui, -apple-system, sans-serif';
  ctx.fillText(`${CATEGORY_LABELS[category]} Entries`, statsCardX + statWidth / 2, statsCardY + 60);

  // Percentage of total
  const percentOfTotal = Math.round((categoryData.totalEntries / totalYearEntries) * 100);
  ctx.fillStyle = PALETTE.accent;
  ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
  ctx.fillText(`${percentOfTotal}%`, statsCardX + statWidth + statWidth / 2, statsCardY + 40);
  ctx.fillStyle = PALETTE.textSecondary;
  ctx.font = '12px system-ui, -apple-system, sans-serif';
  ctx.fillText('of All Entries', statsCardX + statWidth + statWidth / 2, statsCardY + 60);

  // Top moods section
  ctx.fillStyle = PALETTE.textPrimary;
  ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`Top Moods in ${CATEGORY_LABELS[category]}`, statsCardX, statsCardY + 120);

  // Mood bars
  let barY = statsCardY + 150;
  const barHeight = 55;
  const barSpacing = 15;
  const maxBarWidth = statsCardWidth - 120;

  if (categoryData.topMoods.length === 0) {
    ctx.fillStyle = PALETTE.textSecondary;
    ctx.font = 'italic 16px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No entries in this category', width / 2, barY + 40);
  } else {
    categoryData.topMoods.forEach((mood) => {
      // Emoji
      ctx.font = '32px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(mood.emoji, statsCardX, barY + 35);

      // Emotion name
      ctx.fillStyle = PALETTE.textPrimary;
      ctx.font = '18px system-ui, -apple-system, sans-serif';
      ctx.fillText(mood.emotion, statsCardX + 50, barY + 22);

      // Count
      ctx.fillStyle = PALETTE.textSecondary;
      ctx.font = '14px system-ui, -apple-system, sans-serif';
      ctx.fillText(`${mood.count} entries`, statsCardX + 50, barY + 45);

      // Progress bar background
      const barX = statsCardX + 160;
      const barWidth = maxBarWidth * (mood.percentage / 100);

      ctx.fillStyle = PALETTE.progressBg;
      drawRoundedRect(ctx, barX, barY + 15, maxBarWidth, 30, 15);
      ctx.fill();

      // Progress bar fill
      if (barWidth > 30) {
        ctx.fillStyle = PALETTE.progressFill;
        drawRoundedRect(ctx, barX, barY + 15, barWidth, 30, 15);
        ctx.fill();
      }

      // Percentage
      ctx.fillStyle = PALETTE.textPrimary;
      ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${mood.percentage}%`, statsCardX + statsCardWidth, barY + 35);

      barY += barHeight + barSpacing;
    });
  }

  // Footer branding
  ctx.fillStyle = PALETTE.textSecondary;
  ctx.font = '14px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('90 Day Reset • Mood Journal', width / 2, height - 40);

  // Convert to blob
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob!);
    }, 'image/png', 1.0);
  });
}
