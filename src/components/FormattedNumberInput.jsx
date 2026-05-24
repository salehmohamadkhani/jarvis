import { NumberInput } from '@mantine/core'

export default function FormattedNumberInput({ thousandSeparator = ',', ...props }) {
  return <NumberInput thousandSeparator={thousandSeparator} {...props} />
}

