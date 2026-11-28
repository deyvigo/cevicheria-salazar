export const HERO_INTERVAL_MS = 6000;

export interface HeroSlide {
  small: string;
  large: string;
}

export const HERO_SLIDES: HeroSlide[] = [1, 2, 3].map((n) => ({
  small: `/hero/hero-${n}-1200.webp`,
  large: `/hero/hero-${n}-2000.webp`,
}));
