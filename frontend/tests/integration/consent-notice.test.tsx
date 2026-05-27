import { screen, cleanup, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { ConsentNotice } from '@/components/public/ConsentNotice'
import { renderWithProviders } from '../utils/renderWithProviders'

describe('ConsentNotice Component', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders the consent notice when not dismissed', () => {
    renderWithProviders(<ConsentNotice />)
    expect(screen.getByText(/We use essential browser storage for security/i)).toBeInTheDocument()
    expect(screen.queryByText(/What we store & why/i)).not.toBeInTheDocument()
  })

  it('toggles the detailed info panel when clicking Learn more', async () => {
    renderWithProviders(<ConsentNotice />)
    const learnMoreBtn = screen.getByRole('button', { name: /Learn more/i })
    
    // Expand drawer
    fireEvent.click(learnMoreBtn)
    expect(await screen.findByText(/What we store & why/i)).toBeInTheDocument()
    expect(screen.getByText(/CSRF Security Token/i)).toBeInTheDocument()
  })

  it('dismisses notice and sets localStorage key when Got it is clicked', () => {
    renderWithProviders(<ConsentNotice />)
    const gotItBtn = screen.getByRole('button', { name: /Got it/i })
    
    fireEvent.click(gotItBtn)
    
    expect(localStorage.getItem('storage_notice_dismissed')).toBe('true')
    expect(screen.queryByText(/We use essential browser storage for security/i)).not.toBeInTheDocument()
  })

  it('does not render if previously dismissed', () => {
    localStorage.setItem('storage_notice_dismissed', 'true')
    renderWithProviders(<ConsentNotice />)
    expect(screen.queryByText(/We use essential browser storage for security/i)).not.toBeInTheDocument()
  })
})
