import { NumberInput } from '@mantine/core'

/**
 * A wrapper around Mantine's NumberInput that automatically adds thousand separators
 * for better readability of large numbers.
 */
export default function FormattedNumberInput({ thousandSeparator = ',', ...props }) {
  return <NumberInput thousandSeparator={thousandSeparator} {...props} />
}

