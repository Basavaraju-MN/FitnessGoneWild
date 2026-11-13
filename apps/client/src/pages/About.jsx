import { useEffect, useState } from 'react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import SectionHeader from '../components/common/SectionHeader';
import RichText from '../components/common/RichText';
import { getAbout } from '../api/treks';
import '../styles/about.css';

// About page (/about): our story, the founder, the team and what we stand
// for. Everything (texts and photos) is edited in the admin → About Page.
// Built from the home page's own parts (sections, headings, cards, stats
// strip, contact block), so both pages look like one site.
const FALLBACK_BANNER = '/images/hero1.jpg';
const WHATSAPP = 'https://wa.me/918762350551';

const initials = (name) => String(name || '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

export default function About() {
  const [about, setAbout] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    const before = document.title;
    document.title = 'About us | The Fitness Gone Wild';
    return () => { document.title = before; };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    getAbout({ signal: controller.signal })
      .then(setAbout)
      .catch((error) => {
        if (error?.name !== 'AbortError') setFailed(true);
      });
    return () => controller.abort();
  }, []);

  if (!about) {
    return (
      <>
        <Header />
        <main className="about-page about-loading">
          {failed
            ? <p>The page could not be loaded. <a href="/about">Try again</a></p>
            : <p>Loading…</p>}
        </main>
        <Footer />
      </>
    );
  }

  const { content, photos, team } = about;
  const { banner, story, stats, founder, values, cta } = content;
  const showFounder = founder.show && founder.name;
  const valueItems = (values.items || []).filter((item) => item.title);
  const credentials = (founder.credentials || []).filter(Boolean);

  return (
    <>
      <Header />

      <main className="about-page">
        {/* 1. Banner */}
        <section className="about-banner" style={{ backgroundImage: `url('${photos.banner || FALLBACK_BANNER}')` }}>
          <div className="about-banner-inner">
            {banner.eyebrow && <p className="eyebrow">{banner.eyebrow}</p>}
            <h1>{banner.title}</h1>
            {banner.subtitle && <p className="about-banner-sub">{banner.subtitle}</p>}
          </div>
        </section>

        {/* 2. Our story, with the numbers strip under it */}
        <section className="section section-alt">
          <div className="about-inner">
            <div className="about-story">
              <div className="about-story-side">
                {story.eyebrow && <p className="eyebrow">{story.eyebrow}</p>}
                {story.title && <h2 className="about-title">{story.title}</h2>}
                {photos.story && <img className="about-story-photo" src={photos.story} alt="" loading="lazy" />}
              </div>
              <RichText html={story.text} className="about-story-text" />
            </div>

            {stats.length > 0 && (
              <div className="stats">
                {stats.map((stat) => <div key={`${stat.value}-${stat.label}`}><strong>{stat.value}</strong><span>{stat.label}</span></div>)}
              </div>
            )}
          </div>
        </section>

        {/* 3. Founder */}
        {showFounder && (
          <section className="section">
            <div className={`about-founder ${photos.founder ? '' : 'no-photo'}`}>
              {photos.founder && <img className="about-founder-photo" src={photos.founder} alt={founder.name} loading="lazy" />}
              <div>
                {founder.eyebrow && <p className="eyebrow">{founder.eyebrow}</p>}
                <h2 className="about-title">{founder.name}</h2>
                {founder.role && <p className="about-role">{founder.role}</p>}
                {founder.note && <RichText html={founder.note} as="blockquote" className="about-note" />}
                {credentials.length > 0 && (
                  <ul className="about-credentials">
                    {credentials.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                )}
                {founder.instagram && (
                  <a className="about-link" href={founder.instagram} target="_blank" rel="noreferrer">Follow on Instagram →</a>
                )}
              </div>
            </div>
          </section>
        )}

        {/* 4. Team */}
        {team.length > 0 && (
          <section className="section section-alt">
            <div className="about-inner">
              <SectionHeader eyebrow={content.team.eyebrow} title={content.team.title} description={content.team.subtitle} />
              <div className="team-grid">
                {team.map((member) => (
                  <article className="team-card" key={member.id}>
                    {member.photo
                      ? <img className="team-photo" src={member.photo} alt={member.name} loading="lazy" />
                      : <div className="team-photo team-initials" aria-hidden="true">{initials(member.name)}</div>}
                    <div className="team-body">
                      <h3>{member.name}</h3>
                      {member.role && <p className="about-role">{member.role}</p>}
                      {member.intro && <p className="team-intro">{member.intro}</p>}
                      {member.fact && <p className="team-fact">{member.fact}</p>}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 5. What we stand for (the home page's "Why us" cards) */}
        {valueItems.length > 0 && (
          <section className="section">
            <SectionHeader eyebrow={values.eyebrow} title={values.title} />
            <div className="why-grid">
              {valueItems.map((item) => (
                <article className="why-card" key={item.title}>
                  {item.icon && <span className="why-icon">{item.icon}</span>}
                  <h3>{item.title}</h3>
                  {item.text && <p>{item.text}</p>}
                </article>
              ))}
            </div>
          </section>
        )}

        {/* 6. Call to action (the home page's contact block) */}
        <section className="cta">
          <div className="cta-inner">
            <h2>{cta.title || 'Ready for your first trek with us?'}</h2>
            <div className="cta-actions">
              <a className="btn btn-lg" href="/#trips">{cta.button_label || 'See upcoming trips'}</a>
              <a className="btn-ghost" href={WHATSAPP} target="_blank" rel="noreferrer">WhatsApp us</a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
