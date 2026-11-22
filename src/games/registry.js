// Extensible Mini-Games Registry for Royal Arcade Hub
// To add a new mini-game later, append an entry here and render its card automatically below!

import PixelOdysseyGame from './pixelOdyssey/PixelOdysseyGame';
import { startHubBannerLoop } from './pixelOdyssey/engine';

export const MINIGAMES_REGISTRY = [
  {
    id: 'pixel_odyssey',
    title: 'ادیسه پیکسلی رویال',
    subtitle: 'Royal Pixel Odyssey',
    description:
      'ماجراجویی اکشن پلتفرمر پیکسلی در ۵ قلمرو افسانه‌ای با باس‌فایت‌های چندفاز، ۸ اسکین، ۸ اسلحه، همراهان پرنده، قدرت ویژه و لیدربرد جهانی.',
    tags: ['پیکسلی HD', 'پلتفرمر اکشن', 'باس‌فایت', 'فروشگاه اسلحه'],
    badge: 'جدید',
    Component: PixelOdysseyGame,
    startBanner: startHubBannerLoop,
  },
];
