import Box from '@mui/material/Box'
import type { ReactNode } from 'react'

interface TabPanelProps {
  children?: ReactNode
  index: number
  value: number
  prefix?: string
}

export function TabPanel({ children, value, index, prefix = 'tabpanel', ...other }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`${prefix}-${index}`}
      aria-labelledby={`${prefix}-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  )
}
