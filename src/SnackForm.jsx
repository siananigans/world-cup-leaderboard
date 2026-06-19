import React from 'react'

// Link to the Google Form where snacks are logged. Set VITE_SNACK_FORM_URL at
// build time; if it's not set, this section is hidden.
const FORM_URL = import.meta.env.VITE_SNACK_FORM_URL

// Optional ordering details so people can have snacks delivered to the office.
// Set these via env (VITE_*) to override; otherwise the defaults below are used.
const OFFICE_ADDRESS =
  import.meta.env.VITE_OFFICE_ADDRESS ||
  'WeWork Bentall 2, 555 Burrard St Vancouver, BC V7X 1M8'
const UBER_EATS_URL =
  import.meta.env.VITE_UBER_EATS_URL ||
  'https://www.ubereats.com/ca/feed?diningMode=DELIVERY&pl=JTdCJTIyYWRkcmVzcyUyMiUzQSUyMldlV29yayUyMEJlbnRhbGwlMjBJSSUyMiUyQyUyMnJlZmVyZW5jZSUyMiUzQSUyMjRmZDg1Y2YwLTRhOWUtM2JiNi1lYWQ5LTViOWNkZDZjZjUyMyUyMiUyQyUyMnJlZmVyZW5jZVR5cGUlMjIlM0ElMjJ1YmVyX3BsYWNlcyUyMiUyQyUyMmxhdGl0dWRlJTIyJTNBNDkuMjg2MzIwNCUyQyUyMmxvbmdpdHVkZSUyMiUzQS0xMjMuMTE5MDQxOSU3RA%3D%3D'
const DOORDASH_URL =
  import.meta.env.VITE_DOORDASH_URL ||
  'https://www.doordash.com/home?newUser=true&srsltid=AfmBOooop1byw6AWCPPFEQhE5tnhrrMa5slQdDFDltCZ264oJfyuYsaC'

function SnackForm() {
  const [copied, setCopied] = React.useState(false)

  if (!FORM_URL) return null

  const handleCopy = () => {
    navigator.clipboard?.writeText(OFFICE_ADDRESS)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

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

      <div className="snack-delivery">
        <h3>🚚 Order in for the office</h3>
        {OFFICE_ADDRESS && (
          <p className="snack-address">
            <span className="snack-address-label">Deliver to</span>
            <span className="snack-address-value">{OFFICE_ADDRESS}</span>
            <button
              type="button"
              className={`snack-copy${copied ? ' copied' : ''}`}
              onClick={handleCopy}
            >
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          </p>
        )}
        <div className="snack-links">
          <a
            className="snack-btn delivery"
            href={UBER_EATS_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Order on Uber Eats ↗
          </a>
          <a
            className="snack-btn delivery"
            href={DOORDASH_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Order on DoorDash ↗
          </a>
        </div>
      </div>
    </section>
  )
}

export default SnackForm
