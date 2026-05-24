const colors = [
  { name: 'Primary', token: '--color-primary', hex: '#0ea5e9' },
  { name: 'Primary Dark', token: '--color-primary-dark', hex: '#0284c7' },
  { name: 'Surface', token: '--color-surface', hex: '#ffffff' },
  { name: 'Background', token: '--color-bg', hex: '#f4f6fb' },
  { name: 'Muted', token: '--color-muted', hex: '#94a3b8' },
]

export default function DesignKit() {
  return (
    <div className="design-kit">
      <section className="design-section">
        <h4>Colors</h4>
        <div className="color-grid">
          {colors.map((color) => (
            <div key={color.token} className="swatch">
              <div className="swatch-chip" style={{ background: color.hex }} />
              <p>
                <strong>{color.name}</strong>
                <span>{color.hex}</span>
                <code>{color.token}</code>
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="design-section">
        <h4>Typography</h4>
        <div className="text-samples">
          <p className="text-sample title">H1 — Planner heading</p>
          <p className="text-sample subtitle">Subtitle • muted text</p>
          <p className="text-sample body">Body text — regular content line height 1.5</p>
          <p className="text-sample caption">Caption text • 12px</p>
        </div>
      </section>

      <section className="design-section">
        <h4>Buttons</h4>
        <div className="kit-buttons">
          <button className="primary-btn">Primary</button>
          <button className="ghost-btn">Ghost</button>
          <button className="pill">Pill</button>
        </div>
      </section>

      <section className="design-section">
        <h4>Cards</h4>
        <div className="kit-card">
          <span className="muted">Card header</span>
          <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam sed.</p>
          <div className="kit-card-actions">
            <button className="ghost-btn">Secondary</button>
            <button className="primary-btn">Primary</button>
          </div>
        </div>
      </section>
    </div>
  )
}
