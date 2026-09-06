const express = require('express');
const path = require('path');
const store = require('./lib/transactionStore');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/transactions', (req, res) => {
  res.json(store.getAll());
});

app.post('/api/transactions/simulate', (req, res) => {
  const { product } = req.body || {};
  if (!store.PRODUCTS[product]) {
    return res.status(400).json({
      error: `product must be one of: ${Object.keys(store.PRODUCTS).join(', ')}`,
    });
  }
  const transaction = store.addSimulatedPurchase(product);
  res.status(201).json(transaction);
});

app.listen(PORT, () => {
  console.log(`Demo transaction app listening on http://localhost:${PORT}`);
});
