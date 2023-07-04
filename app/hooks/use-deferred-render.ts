import { useEffect, useState } from 'react';

export function useDeferredRender (value: boolean): boolean {
  const [render, setRender] = useState(value);

  useEffect(() => {
    if (!render) {
      let id = window.requestAnimationFrame(() => {
        id = window.requestAnimationFrame(() => setRender(true));
      });

      return () => window.cancelAnimationFrame(id);
    }
  }, []);

  return render;
}
