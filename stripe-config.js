// Stripe Payment Handler for MusicConnectZ
// Uses your local backend at http://localhost:3000

let stripePublishableKey = 'pk_test_51StwuULBPTJnpDqUFJ723wsOuOhbWtGMSSavjPDBZsBVRKUCoQuExkx0BzD9mn55J7hB8lmNyiPobHQe9GP7ch8O0082YqeIHv';
let backendUrl = 'http://localhost:3000';

// Initialize Stripe
let stripe = null;
try {
  stripe = Stripe(stripePublishableKey);
} catch (e) {
  console.warn('Stripe not initialized. Set your publishable key.');
}

async function createStripeCheckout() {
  const amount = document.getElementById('serviceAmount').value;
  const description = document.getElementById('serviceDesc').value;
  const taxMode = document.getElementById('taxMode').value;
  const email = (window.appState && appState.user.email) || '';

  if (!amount || amount <= 0) {
    alert('Please enter a valid service amount');
    return;
  }

  if (!description) {
    alert('Please enter a service description');
    return;
  }

  // Optional: show loading state if button available
  const btn = event && event.target && event.target.closest('button');
  const originalText = btn ? btn.textContent : null;
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Creating payment...'; }

  try {
    const response = await fetch(`${backendUrl}/api/create-checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: parseFloat(amount),
        description,
        taxMode,
        customerEmail: email,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.url) {
      throw new Error(data.error || 'Failed to create checkout session');
    }

    // Show payment link
    document.getElementById('paymentLink').href = data.url;
    document.getElementById('paymentLink').textContent = '✓ Open Stripe Checkout';
    document.getElementById('paymentLinkDisplay').style.display = 'block';

    console.log('✅ Checkout session created:', data.sessionId);
  } catch (error) {
    console.error('Error:', error);
    alert('❌ Error: ' + error.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = originalText; }
  }
}

function updateTaxMode() {
  const taxMode = document.getElementById('taxMode').value;
  const manualTaxDiv = document.getElementById('manualTaxDiv');
  if (manualTaxDiv) {
    manualTaxDiv.style.display = taxMode === 'manual' ? 'block' : 'none';
  }
}

function checkPaymentStatus() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('session_id')) {
    alert('✅ Payment successful!');
    window.history.replaceState({}, document.title, window.location.pathname);
  }
  if (params.get('canceled')) {
    alert('❌ Payment canceled. Please try again.');
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

window.addEventListener('load', () => {
  checkPaymentStatus();
  const taxSelect = document.getElementById('taxMode');
  if (taxSelect && !taxSelect.hasAttribute('data-listener')) {
    taxSelect.setAttribute('data-listener', 'true');
    taxSelect.addEventListener('change', updateTaxMode);
  }
});
