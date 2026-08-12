interface Props {
  eyebrow: string;
  title: string;
  description?: string;
  light?: boolean;
}

export default function SectionHeader({ eyebrow, title, description, light }: Props) {
  return (
    <div className={`section-head ${light ? 'section-head-light' : ''}`}>
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {description && <p className="section-sub">{description}</p>}
    </div>
  );
}
