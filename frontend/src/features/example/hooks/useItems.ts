import { useState, useEffect } from 'react';
import { itemsService } from '../../../services/itemsService';
import type { Item, CreateItemRequest } from '../../../types/api';

export function useItems() {
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    itemsService
      .getAll()
      .then((data) => {
        if (active) setItems(data);
      })
      .catch((err: Error) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const createItem = async (payload: CreateItemRequest): Promise<Item> => {
    const newItem = await itemsService.create(payload);
    setItems((prev) => [...prev, newItem]);
    return newItem;
  };

  return { items, isLoading, error, createItem };
}
