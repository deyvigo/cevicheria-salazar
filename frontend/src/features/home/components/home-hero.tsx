import { useId, type FocusEvent } from 'react';
import { Link } from 'react-router-dom';
import { buttonClassName } from '@/components/button-class-name';
import { HERO_INTERVAL_MS, HERO_SLIDES } from '@/features/home/hero-slides';
import { useCarousel } from '@/features/home/use-carousel';

export function HomeHero() {
  const titleId = useId();
  const { index, paused, reducedMotion, goTo, togglePaused, hold } = useCarousel(HERO_SLIDES.length, HERO_INTERVAL_MS);

  function leaveFocus(event: FocusEvent<HTMLElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) hold(false);
  }

  return (
    <section
      aria-labelledby={titleId}
      className="relative isolate flex min-h-[60svh] items-center overflow-hidden bg-ink lg:min-h-[70svh]"
      onMouseEnter={() => hold(true)}
      onMouseLeave={() => hold(false)}
      onFocus={() => hold(true)}
      onBlur={leaveFocus}
    >
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        {HERO_SLIDES.map((slide, slideIndex) => (
          <img
            key={slide.large}
            src={slide.large}
            srcSet={`${slide.small} 1200w, ${slide.large} 2000w`}
            sizes="100vw"
            alt=""
            loading={slideIndex === 0 ? 'eager' : 'lazy'}
            fetchPriority={slideIndex === 0 ? 'high' : 'low'}
            data-active={slideIndex === index}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 motion-reduce:transition-none ${
              slideIndex === index ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ))}
        <div className="absolute inset-0 bg-ink/60 lg:bg-transparent lg:bg-linear-to-r lg:from-ink/80 lg:via-ink/55 lg:to-ink/20" />
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-5 px-6 py-16">
        <h1 id={titleId} className="max-w-xl font-display text-title-xl text-surface">
          El sabor del mar en cada plato
        </h1>
        <p className="max-w-xl text-body-lg text-surface">
          Ceviches y chicharrones preparados al momento. Haz tu pedido en minutos.
        </p>
        <Link to="/menu" className={buttonClassName('primary')}>
          Ver la carta
        </Link>
      </div>

      <div className="absolute right-0 bottom-4 left-0 mx-auto flex w-full max-w-6xl items-center gap-2 px-6">
        {HERO_SLIDES.map((slide, slideIndex) => (
          <button
            key={slide.large}
            type="button"
            onClick={() => goTo(slideIndex)}
            aria-label={`Ver foto ${slideIndex + 1} de ${HERO_SLIDES.length}`}
            aria-current={slideIndex === index ? 'true' : undefined}
            className="flex h-8 items-center rounded-full px-1 focus-visible:shadow-focus focus-visible:outline-none"
          >
            <span
              className={`block h-2 rounded-full transition-all duration-300 motion-reduce:transition-none ${
                slideIndex === index ? 'w-6 bg-surface' : 'w-2 bg-surface/50 hover:bg-surface/80'
              }`}
            />
          </button>
        ))}
        {reducedMotion ? null : (
          <button
            type="button"
            onClick={togglePaused}
            className="ml-2 min-h-8 rounded-md px-2 text-caption text-surface underline-offset-2 hover:underline focus-visible:shadow-focus focus-visible:outline-none"
          >
            {paused ? 'Reanudar fotos' : 'Pausar fotos'}
          </button>
        )}
      </div>
    </section>
  );
}
