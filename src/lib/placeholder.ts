export function escapeXml(str: string) {
  return String(str).replace(/[&<>"']/g, function (c) {
    switch (c) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&apos;';
      default:
        return c;
    }
  });
}

export function makeProductPlaceholder(name: string, id?: number, width = 1200, height = 800) {
  const text = (name || 'Producto').toUpperCase().slice(0, 24);
  // simple deterministic palette
  const colors = ['#0A2A66', '#2E5FA7', '#153B82', '#355C97', '#6A8EC0', '#7F96BB'];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = (hash << 5) - hash + (name || '').charCodeAt(i);
    hash |= 0;
  }
  const color = colors[Math.abs(hash) % colors.length];
  const color2 = '#0f1724';

  const svg = `
  <svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}' viewBox='0 0 ${width} ${height}'>
    <defs>
      <linearGradient id='g' x1='0' x2='1' y1='0' y2='1'>
        <stop offset='0' stop-color='${color}' stop-opacity='1'/>
        <stop offset='1' stop-color='${color2}' stop-opacity='0.9'/>
      </linearGradient>
    </defs>
    <rect width='100%' height='100%' fill='url(#g)' />
    <g>
      <text x='50%' y='48%' dominant-baseline='middle' text-anchor='middle' font-family='Inter, Arial, Helvetica, sans-serif' font-size='64' fill='rgba(255,255,255,0.95)' font-weight='700'>${escapeXml(text)}</text>
    </g>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
