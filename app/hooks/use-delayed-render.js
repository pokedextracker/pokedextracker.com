import { useEffect, useState } from 'react';

export function useDelayedRender (delay) {
  const [render, setRender] = useState(delay <= 0);

  useEffect(() => {
    if (delay > 0) {
      const id = setTimeout(() => setRender(true), delay);
      return () => clearTimeout(id);
    }
  }, []);

  return render;
}
