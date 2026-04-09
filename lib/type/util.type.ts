export type TData<T> = {
  page: number
  perPage: number
  totalCount: number
  data: Array<T>
}
