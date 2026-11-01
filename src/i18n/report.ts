// Try-on "Report a problem" text, kept apart so en.ts and he.ts stay short. Same rules as there.

import type { Translation } from './en'

export const reportEn = {
  open: 'Report a problem',
  title: 'Report a problem',
  preview: 'The moment you reported',
  what: 'What looks wrong?',
  categories: {
    position: 'Ring in the wrong place',
    size: 'Wrong size',
    angle: 'Wrong angle',
    jitter: 'Jitters',
    occlusion: 'Hidden or shown wrongly',
    lighting: 'Colours or lighting look wrong',
    other: 'Other',
  },
  comment: 'Comment',
  commentHint: 'Anything else? (optional)',
  contains: 'The file holds:',
  contents: {
    photo: 'A photo of your hand from the camera, with and without the ring',
    tracking: 'Where the app found your hand in the last 2 seconds',
    settings: 'The ring design and your try-on settings',
    device: 'Camera, browser and device details (no names or accounts)',
  },
  private: 'The file is made on this device. It leaves it only if you send it.',
  pick: 'Pick what looks wrong to make the file.',
  download: 'Download report',
  share: 'Share report',
  issue: 'Open a GitHub issue (attach the downloaded file)',
}

export const reportHe: Translation['report'] = {
  open: 'דיווח על בעיה',
  title: 'דיווח על בעיה',
  preview: 'הרגע שעליו דיווחת',
  what: 'מה נראה לא נכון?',
  categories: {
    position: 'הטבעת לא במקום',
    size: 'גודל לא נכון',
    angle: 'זווית לא נכונה',
    jitter: 'הטבעת רועדת',
    occlusion: 'מוסתרת או מוצגת לא נכון',
    lighting: 'הצבעים או התאורה לא נכונים',
    other: 'אחר',
  },
  comment: 'הערה',
  commentHint: 'עוד משהו? (לא חובה)',
  contains: 'הקובץ כולל:',
  contents: {
    photo: 'תמונה של היד שלך מהמצלמה, עם הטבעת ובלעדיה',
    tracking: 'איפה האפליקציה זיהתה את היד ב־2 השניות האחרונות',
    settings: 'עיצוב הטבעת והגדרות המדידה שלך',
    device: 'פרטי המצלמה, הדפדפן והמכשיר (בלי שמות או חשבונות)',
  },
  private: 'הקובץ נוצר במכשיר הזה. הוא יוצא ממנו רק אם תשלחו אותו.',
  pick: 'בחרו מה לא נכון כדי ליצור את הקובץ.',
  download: 'הורדת הדיווח',
  share: 'שיתוף הדיווח',
  issue: 'פתיחת issue ב־GitHub (צרפו את הקובץ שהורדתם)',
}
