import z from "zod"
import { isValid, parseISO } from "date-fns"

/**
 * Creates a reusable date-only Zod schema
 * @param required - if false, makes the field optional
 * @param requiredMessage - error message for missing value
 */
export const dateOnlySchema = (required = true, requiredMessage = "Date is required") => {
  let schema = z.string()

  if (required) {
    schema = schema.nonempty(requiredMessage)
  }

  schema = schema.refine((val) => !val || isValid(parseISO(val)), {
    message: "Date is invalid",
  })
  if (!required) return schema.optional()

  return schema
}
