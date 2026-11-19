const express = require('express');
const { createHash, timingSafeEqual } = require('node:crypto');
const orders = require('./orders.json');

const app = express();
app.disable('x-powered-by');
app.disable('etag');

app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  const token = process.env.API_TOKEN;
  if (!token) return res.status(503).json({ api_error: 'Service unavailable' });
  const match = /^Bearer ([^\s]+)$/i.exec(req.get('authorization') || '');
  const digest = value => createHash('sha256').update(value).digest();
  if (!match || !timingSafeEqual(digest(match[1]), digest(token))) {
    res.set('WWW-Authenticate', 'Bearer');
    return res.status(401).json({ api_error: 'Unauthorized' });
  }
  next();
});

app.get('/orders/:order_id', (req, res) => {
  const order = Object.hasOwn(orders, req.params.order_id) ? orders[req.params.order_id] : null;
  if (!order) return res.status(404).json({ api_error: 'Order not found' });
  res.json(order);
});
app.use((req, res) => res.status(404).json({ api_error: 'Not found' }));
app.use((err, req, res, next) => {
  res.status(err.status === 400 ? 400 : 500).json({ api_error: err.status === 400 ? 'Invalid request' : 'Internal server error' });
});

module.exports = app;
if (require.main === module) app.listen(process.env.PORT || 3000);
