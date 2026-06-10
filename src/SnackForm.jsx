import React from 'react'

// Link to the Google Form where snacks are logged. Set VITE_SNACK_FORM_URL at
// build time; if it's not set, this section is hidden.
const FORM_URL = import.meta.env.VITE_SNACK_FORM_URL

function SnackForm() {
  if (!FORM_URL) return null

  return (
    <section className="snack-form">
      <h2>🍪 Log a snack day</h2>
      <p className="snack-intro">
        Brought snacks in? Log it to bank your +7. Updates appear on the board
        at the next sync (within ~30 minutes).
      </p>
      <a
        className="snack-btn primary"
        href={FORM_URL}
        target="_blank"
        rel="noopener noreferrer"
      >
        Open the snack form ↗
      </a>
    </section>
  )
}

export default SnackForm
