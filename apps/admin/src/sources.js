// Where a lead came from (enquiries.source), in the order shown on screen.
// "brochure" leads are added automatically when someone downloads a brochure.
export const LEAD_SOURCES = [
  { value: 'brochure', label: 'Brochure download', short: 'Brochure', icon: '📄' },
  { value: 'website', label: 'Website', short: 'Website', icon: '🌐' },
  { value: 'whatsapp', label: 'WhatsApp', short: 'WhatsApp', icon: '💬' },
  { value: 'instagram', label: 'Instagram', short: 'Instagram', icon: '📸' },
  { value: 'phone', label: 'Phone call', short: 'Phone', icon: '📞' },
  { value: 'walkin', label: 'Walk-in', short: 'Walk-in', icon: '🚶' },
];

export const sourceOf = (value) =>
  LEAD_SOURCES.find((s) => s.value === value) || { value, label: value || '—', short: value || '—', icon: '•' };

// Sources the team picks when adding a lead by hand
export const MANUAL_SOURCES = LEAD_SOURCES.filter((s) => s.value !== 'brochure');
