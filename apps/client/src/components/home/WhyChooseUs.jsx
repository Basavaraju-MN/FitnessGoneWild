import { useEffect, useState } from 'react';
import { getWhyUs } from '../../api/treks';
import { stats } from '../../data/content';
import SectionHeader from '../common/SectionHeader';

const DEFAULT_ICONS = ['🧭', '👥', '🚌', '🩹', '🧾', '🌿'];

export default function WhyChooseUs() {
  const [whyUs, setWhyUs] = useState([]);

  useEffect(() => {
    const fetchWhyUs = async () => {
      try {
        const data = await getWhyUs();
        if (Array.isArray(data) && data.length > 0) {
          setWhyUs(data.map((item, index) => ({
            id: item.id,
            title: item.title,
            description: item.description,
            icon: DEFAULT_ICONS[index % DEFAULT_ICONS.length],
          })));
        }
      } catch (error) {
        console.error('Failed to load why us items:', error);
        setWhyUs([]);
      }
    };

    fetchWhyUs();
  }, []);

  return (
    <section className="section" id="why">
      <SectionHeader eyebrow="Why choose us" title="Six reasons people rebook" description="We've been running Western Ghats trips since 2018. These are the things our regulars actually tell us they came back for." />
      <div className="why-grid">
        {whyUs.length === 0 ? (
          <p>Loading reasons to travel with us...</p>
        ) : (
          whyUs.map((item) => (
            <article className="why-card" key={item.id || item.title}>
              <span className="why-icon">{item.icon}</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))
        )}
      </div>
      <div className="stats">
        {stats.map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}
      </div>
    </section>
  );
}
