export type ToastType = 'success' | 'error' | 'info';

export const toast = {
  success: (message: string) => {
    const event = new CustomEvent('app-toast', { detail: { message, type: 'success' } });
    window.dispatchEvent(event);
  },
  error: (message: string) => {
    const event = new CustomEvent('app-toast', { detail: { message, type: 'error' } });
    window.dispatchEvent(event);
  },
  info: (message: string) => {
    const event = new CustomEvent('app-toast', { detail: { message, type: 'info' } });
    window.dispatchEvent(event);
  }
};
