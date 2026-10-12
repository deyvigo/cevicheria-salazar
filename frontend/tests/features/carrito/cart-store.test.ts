import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CART_STORAGE_KEY, useCartStore } from '@/features/carrito/cart-store';

const dish = (id: number, stock = 10, available = true) => ({ id, name: `Plato ${id}`, available, stock });

beforeEach(() => {
  localStorage.clear();
  useCartStore.setState({ items: [], lastAdded: null });
});

describe('cart-store', () => {
  it('agregar dos veces el mismo plato deja una sola fila con cantidad 2', () => {
    useCartStore.getState().add(dish(1));
    useCartStore.getState().add(dish(1));

    expect(useCartStore.getState().items).toEqual([{ productId: 1, quantity: 2 }]);
    expect(useCartStore.getState().lastAdded?.name).toBe('Plato 1');
  });

  it('no pasa del stock ni agrega un plato no pedible', () => {
    const { add } = useCartStore.getState();
    for (let i = 0; i < 5; i++) add(dish(1, 3));
    add(dish(2, 5, false));
    add(dish(3, 0));

    expect(useCartStore.getState().items).toEqual([{ productId: 1, quantity: 3 }]);
  });

  it('importar toma la cantidad del enlace para un plato en ambos y conserva los demás', () => {
    useCartStore.setState({
      items: [
        { productId: 1, quantity: 5 },
        { productId: 2, quantity: 1 },
      ],
    });

    useCartStore.getState().importItems([
      { productId: 1, quantity: 2 },
      { productId: 3, quantity: 4 },
    ]);

    expect(useCartStore.getState().items).toEqual([
      { productId: 1, quantity: 2 },
      { productId: 2, quantity: 1 },
      { productId: 3, quantity: 4 },
    ]);
  });

  it('reconcile quita ids ausentes, recorta al stock y conserva un plato con stock 0', () => {
    useCartStore.setState({
      items: [
        { productId: 1, quantity: 50 },
        { productId: 2, quantity: 2 },
        { productId: 3, quantity: 4 },
        { productId: 4, quantity: 1 },
      ],
    });

    // 4 was added after the request started, so it is not in requestedIds and must survive
    useCartStore.getState().reconcile(
      [1, 2, 3],
      [
        { id: 1, stock: 4 },
        { id: 3, stock: 0 },
      ],
    );

    expect(useCartStore.getState().items).toEqual([
      { productId: 1, quantity: 4 },
      { productId: 3, quantity: 4 },
      { productId: 4, quantity: 1 },
    ]);
  });

  it('persiste solo los ítems en localStorage', () => {
    useCartStore.getState().add(dish(9));

    const stored = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) as string);
    expect(stored.state).toEqual({ items: [{ productId: 9, quantity: 1 }] });
  });

  it.each([
    ['JSON roto', '{no es json'],
    ['el arreglo antiguo', JSON.stringify([{ platoId: 1, nombre: 'x', precio: 1, cantidad: 1 }])],
    ['ítems con forma incorrecta', JSON.stringify({ state: { items: [{ productId: 'a' }, null] }, version: 1 })],
  ])('arranca vacío con contenido corrupto: %s', async (_name, raw) => {
    localStorage.setItem(CART_STORAGE_KEY, raw);

    await useCartStore.persist.rehydrate();

    expect(useCartStore.getState().items).toEqual([]);
  });

  it('sigue funcionando en memoria si localStorage lanza al escribir', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    expect(() => useCartStore.getState().add(dish(1))).not.toThrow();
    expect(useCartStore.getState().items).toHaveLength(1);
    spy.mockRestore();
  });

  it('rehidrata cuando otra pestaña cambia la llave', async () => {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({ state: { items: [{ productId: 8, quantity: 2 }] }, version: 1 }),
    );

    window.dispatchEvent(new StorageEvent('storage', { key: CART_STORAGE_KEY }));

    await vi.waitFor(() => expect(useCartStore.getState().items).toEqual([{ productId: 8, quantity: 2 }]));
  });
});
