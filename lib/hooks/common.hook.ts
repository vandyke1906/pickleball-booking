export async function fetcher<T = unknown>(url: string): Promise<T> {
  if (!url) return null as T
  const res = await fetch(url)

  let data: any = null

  try {
    data = await res.json()
  } catch {}

  if (!res.ok) {
    const error = new Error(data?.error || data?.message || res.statusText || "Request failed")
    ;(error as any).status = res.status
    ;(error as any).data = data
    throw error
  }

  return data as T
}
