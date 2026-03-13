'use client';

import {useEffect, useRef, useState, useCallback} from 'react';

export function useInfiniteScroll(
  canLoadMore: boolean,
  onLoadMore: () => void,
  enabled: boolean = true,
  rootRef?: React.RefObject<HTMLDivElement | null>,
  rootMargin: string = '0px 0px 200px 0px'
) {
  const loadingRef = useRef(false);
  const [loaderEl, setLoaderEl] = useState<HTMLDivElement | null>(null);
  const loaderRef = useCallback((el: HTMLDivElement | null) => setLoaderEl(el), []);

  useEffect(() => {
    if (!enabled || !loaderEl) return;
    const root = rootRef?.current || null;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && canLoadMore && !loadingRef.current) onLoadMore();
      },
      {root, rootMargin, threshold: 0}
    );
    observer.observe(loaderEl);

    // ✅ trigger manually if already visible (list shorter than container)
    const rect = loaderEl.getBoundingClientRect();
    const rootRect = root ? root.getBoundingClientRect() : {bottom: window.innerHeight};
    if (rect.top <= rootRect.bottom && canLoadMore && !loadingRef.current) {
      loadingRef.current = true;
      onLoadMore();
    }

    return () => observer.disconnect();
  }, [enabled, canLoadMore, onLoadMore, rootRef, loaderEl, rootMargin]);

  useEffect(() => {
    if (canLoadMore) loadingRef.current = false;
  }, [canLoadMore]);

  return loaderRef;
}
