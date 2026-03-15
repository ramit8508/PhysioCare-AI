export default function HomePage() {
  return (
    <main className="landing-shell">
      <header className="landing-nav">
        <div className="landing-logo">NeuroCareAI</div>
        <nav className="landing-links">
          <a href="#features">Pages</a>
          <a href="#faq">Contact</a>
        </nav>
        <a className="landing-signin" href="/login">
          Sign In
        </a>
      </header>

      <section className="landing-hero">
        <div className="landing-hero__text">
          <h1>
            Physiotherapy,
            <span> Simplified.</span>
          </h1>
          <p>
            Choose the right path for your physical recovery and wellness.
          </p>
        </div>

        <div className="landing-cards" id="features">
          <article className="landing-card">
            <div className="landing-card__head">
              <div>
                <p className="landing-card__label">Patient / User</p>
                <p className="landing-card__sub">Start your recovery journey today.</p>
              </div>
              <span className="landing-card__price">$0</span>
            </div>
            <ul className="landing-card__list">
              <li>Book Doctor Timeslots</li>
              <li>ZegoCloud Video Sessions</li>
              <li>Access Exercise Database</li>
              <li>Live AI Posture Feedback</li>
            </ul>
            <div className="landing-card__actions">
              <a className="landing-button" href="/login">Continue as Patient</a>
            </div>
          </article>

          <article className="landing-card landing-card--pro">
            <div className="landing-card__head">
              <div>
                <p className="landing-card__label">Doctor / Admin</p>
                <p className="landing-card__sub">Manage patients and provide care.</p>
              </div>
              <span className="landing-card__price">Pro</span>
            </div>
            <ul className="landing-card__list">
              <li>Manage Appointments</li>
              <li>Assign Exercise Plans</li>
              <li>View AI Performance Reports</li>
              <li>Admin Control Panel</li>
            </ul>
            <div className="landing-card__actions">
              <a className="landing-button landing-button--primary" href="/doctor/login">
                Continue as Doctor
              </a>
            </div>
          </article>
        </div>
      </section>

      <section className="landing-advantages" id="faq">
        <h2>Why NeuroCareAI</h2>
        <div className="landing-advantages__list">
          <div className="landing-advantage">
            <h3>Faster recovery tracking</h3>
            <p>Realtime posture scoring and AI summaries accelerate progress reviews.</p>
          </div>
          <div className="landing-advantage">
            <h3>One platform for care</h3>
            <p>Book sessions, prescribe exercises, and review reports in one flow.</p>
          </div>
          <div className="landing-advantage">
            <h3>Secure telehealth</h3>
            <p>Role-based access and recorded sessions ensure trust and continuity.</p>
          </div>
          <div className="landing-advantage">
            <h3>Clinician-grade insights</h3>
            <p>Groq reports highlight form errors and ROM trends to guide therapy.</p>
          </div>
        </div>
      </section>

      <section className="landing-footer">
        <div className="landing-footer__logo">NeuroCareAI</div>
        <h3>Level up your recovery</h3>
        <p>
          Take your physical health to the next level by adopting our AI-powered
          physiotherapy platform, empowering you to achieve better results with live
          feedback.
        </p>
      </section>
    </main>
  );
}
