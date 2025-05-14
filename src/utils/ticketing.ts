import { useLocalStorage } from 'usehooks-ts';

// This is used to prevent showing the ticketing modal again after the first view on this device
export function useLocalStorageViewedTicketingModal(eventSerieId: string) {
  const [items, setItems] = useLocalStorage<string[]>('viewed-ticketing-modal-on-series', []);

  const hasViewed = items.includes(eventSerieId);
  const setViewed = () => {
    if (!hasViewed) {
      setItems([...items, eventSerieId]);
    }
  };

  return [hasViewed, setViewed] as const; // `const` to respect the order of types
}
