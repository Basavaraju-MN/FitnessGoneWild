// "Came from" (Instagram ad, Google, ...) sent by the website with a lead or
// booking: cleaned up before it is saved
const clip = (value, max) => {
  const text = String(value ?? '').replace(/[\u0000-\u001f]/g, ' ').trim();
  return text ? text.slice(0, max) : null;
};

exports.cleanTrafficSource = (source, campaign) => ({
  source: clip(source, 60),
  campaign: clip(campaign, 150),
});
