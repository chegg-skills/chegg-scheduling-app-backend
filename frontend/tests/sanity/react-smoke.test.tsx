import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '../utils/renderWithProviders'

function ToggleButton() {
  const [on, setOn] = useState(false)
  return (
    <button type="button" onClick={() => setOn((v) => !v)}>
      {on ? 'On' : 'Off'}
    </button>
  )
}

describe('React Testing Library smoke', () => {
  it('updates the DOM after user interaction', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ToggleButton />)

    expect(screen.getByRole('button', { name: 'Off' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Off' }))
    expect(screen.getByRole('button', { name: 'On' })).toBeInTheDocument()
  })
})
