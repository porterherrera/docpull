// Debug endpoint removed — redirect to home
export default function handler(req, res) {
  res.status(404).json({ error: 'Not found' });
}
