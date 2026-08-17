import { stats, whyUs } from '../../data/content';
import SectionHeader from '../common/SectionHeader';

export default function WhyChooseUs() {
  return (
    <section className="section" id="why">
      <SectionHeader eyebrow="Why choose us" title="Six reasons people rebook" description="We've been running Western Ghats trips since 2018. These are the things our regulars actually tell us they came back for." />
      <div className="why-grid">
        {whyUs.map(([icon, title, description]) => (
          <article className="why-card" key={title}>
            <span className="why-icon">{icon}</span>
            <h3>{title}</h3>
            <p>{description}</p>
          </article>
        ))}
      </div>
      <div className="stats">
        {stats.map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}
      </div>
    </section>
  );
}
