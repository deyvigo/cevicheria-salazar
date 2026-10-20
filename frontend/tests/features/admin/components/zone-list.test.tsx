import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ZoneList } from '@/features/admin/components/zone-list';

const zones = [1, 2, 3].map((id) => ({
  id,
  name: `Zona ${id}`,
  price: 5,
  color: 'celeste' as const,
  active: true,
  coordinates: [],
}));

const scrollTo = vi.fn();
const pageScroll = vi.fn();

function rect(top: number, bottom: number) {
  return { top, bottom, height: bottom - top, left: 0, right: 0, width: 0, x: 0, y: top, toJSON: () => ({}) };
}

function renderList(scrollRequest: { id: number; nonce: number } | null, cardRect: DOMRect) {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    if (this.dataset.zoneId) return cardRect;
    return rect(0, 200) as DOMRect;
  });
  return render(
    <ZoneList
      zones={zones}
      hoveredId={null}
      selectedId={null}
      scrollRequest={scrollRequest}
      onHover={vi.fn()}
      onSelect={vi.fn()}
      onEdit={vi.fn()}
      onDelete={vi.fn()}
    />,
  );
}

describe('ZoneList', () => {
  beforeEach(() => {
    Element.prototype.scrollTo = scrollTo as unknown as typeof Element.prototype.scrollTo;
    Element.prototype.scrollIntoView = pageScroll;
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    scrollTo.mockClear();
    pageScroll.mockClear();
  });

  it('si la tarjeta está fuera del área visible desplaza el contenedor, no la página', () => {
    renderList({ id: 3, nonce: 1 }, rect(400, 460) as DOMRect);

    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth' }));
    expect(pageScroll).not.toHaveBeenCalled();
  });

  it('si la tarjeta ya está visible no desplaza', () => {
    renderList({ id: 2, nonce: 1 }, rect(50, 110) as DOMRect);

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('con movimiento reducido el desplazamiento no es suave', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
    renderList({ id: 3, nonce: 1 }, rect(400, 460) as DOMRect);

    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'auto' }));
  });

  it('sin solicitud de desplazamiento no hace nada', () => {
    renderList(null, rect(400, 460) as DOMRect);

    expect(scrollTo).not.toHaveBeenCalled();
  });
});
