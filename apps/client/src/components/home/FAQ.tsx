import { faq } from '../../data/content';
import SectionHeader from '../common/SectionHeader';

export default function FAQ() {
  return (
    <section className="section" id="faq">
      <SectionHeader eyebrow="Before you book" title="Questions we get every week" />
      <div className="faq">
        {faq.map(([question, answer], index) => (
          <details key={question} open={index === 0}>
            <summary>{question}</summary>
            <p>{answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
