import { describe, it, expect, vi } from 'vitest';
import { reducer } from '../src/hooks/use-toast';
import type { ToastProps } from '../src/components/ui/toast';

describe('useToast reducer', () => {
  it('adds a toast', () => {
    const state = reducer(
      { toasts: [] },
      {
        type: 'ADD_TOAST',
        toast: { id: '1', open: true } as ToastProps & { id: string }
      }
    );
    expect(state.toasts).toHaveLength(1);
  });

  it('dismisses a toast', () => {
    vi.useFakeTimers();
    const state = reducer(
      { toasts: [{ id: '1', open: true } as ToastProps & { id: string }] },
      { type: 'DISMISS_TOAST', toastId: '1' }
    );
    expect(state.toasts[0]?.open).toBe(false);
    vi.runAllTimers();
    vi.useRealTimers();
  });
});
