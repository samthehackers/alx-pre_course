const tbody = document.getElementById('transactions-body');
const videoButton = document.getElementById('simulate-video');
const voiceButton = document.getElementById('simulate-voice');

function formatAmount(amount) {
  return `$${amount.toFixed(2)}`;
}

function formatDate(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

function render(transactions) {
  if (!transactions.length) {
    tbody.innerHTML = '<tr><td colspan="5">No transactions yet.</td></tr>';
    return;
  }

  tbody.innerHTML = transactions
    .map(
      (t) => `
        <tr>
          <td>${formatDate(t.date)}</td>
          <td>${t.description}</td>
          <td>${formatAmount(t.amount)}</td>
          <td class="status-completed">${t.status}</td>
          <td class="reference-id">${t.referenceId}</td>
        </tr>
      `
    )
    .join('');
}

async function loadTransactions() {
  const res = await fetch('/api/transactions');
  const transactions = await res.json();
  render(transactions);
}

async function simulatePurchase(product) {
  videoButton.disabled = true;
  voiceButton.disabled = true;
  try {
    await fetch('/api/transactions/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product }),
    });
    await loadTransactions();
  } finally {
    videoButton.disabled = false;
    voiceButton.disabled = false;
  }
}

videoButton.addEventListener('click', () => simulatePurchase('video'));
voiceButton.addEventListener('click', () => simulatePurchase('voice'));

loadTransactions();
