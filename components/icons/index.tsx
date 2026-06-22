// Close glyph (the cross). Path body unchanged; only the export name is
// corrected so the component name matches the glyph it actually draws.
export const CloseIcon = () => (
  <svg data-slot="icon" className="size-8" fill="none" strokeWidth="1.5" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" >
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12"></path>
  </svg>
)

// Hamburger glyph (the three lines). Path body unchanged; only the export name
// is corrected (and the stray transition class dropped) so it matches the glyph.
export const MenuIcon = () => (
  <svg data-slot="icon" className="size-8" fill="none" strokeWidth="1.5" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" ></path>
  </svg>
)

export const IconChevron = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
  </svg>
)