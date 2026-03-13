'use client';

import useSWR, {mutate as globalMutate, KeyedMutator} from 'swr';

export enum FetcherType {
  JSON = 'json',
  BLOB = 'blob'
}

const fetcher = async (url: string, type: FetcherType = FetcherType.JSON) => {
  const res = await fetch(url);

  if (!res.ok) {
    let errorMessage = 'An error occurred while fetching data.';
    try {
      const errData = await res.json();
      errorMessage = errData?.error || errData?.message || errorMessage;
    } catch {}
    const error: any = new Error(errorMessage);
    error.status = res.status;
    throw error;
  }
  if (type === FetcherType.BLOB) return await res.blob();

  return res.json();
};

type ApiOptions = {
  key: string;
  url: string;
  type?: FetcherType;
};

type ApiResponse<T> = {
  data: T[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
  };
};

export type UseApiResult<T = any> = {
  data: T[];
  total?: number;
  isLoading: boolean;
  error: any;
  mutate?: KeyedMutator<ApiResponse<T>>; // optional if using useLazyApi
  pagination?: {
    total: number;
    page: number;
    limit: number;
  };
  loadMore?: (nextUrl: string) => Promise<void>; // optional if using useApi
};

export function useApi<T = any>({key, url}: ApiOptions) {
  const {data, error, isLoading, mutate} = useSWR<ApiResponse<T>>([key, url], () => fetcher(url), {
    keepPreviousData: true,
    dedupingInterval: 60_000
  });

  return {
    data: data?.data ?? [],
    total: data?.pagination?.total ?? 0,
    isLoading,
    error,
    mutate
  };
}

export function useSingleApi<T = any>({key, url, type}: ApiOptions, fetchOnClick?: boolean) {
  const {data, error, isLoading, mutate} = useSWR<T>(fetchOnClick === true ? null : [key, url], () => fetcher(url, type), {
    dedupingInterval: 60_000
  });

  const swrMutate = async (urlOverride?: string) => {
    const targetUrl = urlOverride ?? url;
    const result = await fetcher(targetUrl, type);
    mutate(result, false); // update SWR cache without revalidation
    return result;
  };

  return {
    data: data ?? null,
    isLoading,
    error,
    mutate: swrMutate
  };
}

export function useLazyApi<T = any>({key, url}: ApiOptions) {
  const {data, error, isLoading, mutate} = useSWR<ApiResponse<T>>([key, url], () => fetcher(url), {
    keepPreviousData: true,
    dedupingInterval: 60_000
  });

  // Load next page and merge results
  const loadMore = async (nextUrl: string) => {
    const nextPage = await fetcher(nextUrl);
    mutate(
      (prev?: ApiResponse<T>) =>
        prev
          ? {
              ...nextPage,
              data: [...prev.data, ...nextPage.data]
            }
          : nextPage,
      false
    );
  };

  return {
    data: data?.data ?? [],
    pagination: data?.pagination,
    isLoading,
    error,
    loadMore
  };
}

export function refreshApi(key: string) {
  return globalMutate(cacheKey => Array.isArray(cacheKey) && cacheKey[0] === key, undefined, {revalidate: true});
}
