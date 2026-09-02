import { useEffect, useState } from 'react';
import { getFaq } from '../../api/treks';
import SectionHeader from '../common/SectionHeader';

export default function FAQ() {
  const [faq, setFaq] = useState([]);

  useEffect(() => {
    const fetchFaq = async () => {
      try {
        const data = await getFaq();
        if (Array.isArray(data) && data.length > 0) {
          setFaq(data.map((item) => ({
            id: item.id,
            question: item.question,
            answer: item.answer,
          })));
        } else {
          setFaq([]);
        }
      } catch (error) {
        console.error('Failed to load FAQ:', error);
        setFaq([]);
      }
    };

    fetchFaq();
  }, []);

  return (
    <section className="section" id="faq">
      <SectionHeader eyebrow="Before you book" title="Questions we get every week" />
      <div className="faq">
        {faq.length === 0 ? (
          <p>Loading questions...</p>
        ) : (
          faq.map((item, index) => (
            <details key={item.id || item.question} open={index === 0}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))
        )}
      </div>
    </section>
  );
}
