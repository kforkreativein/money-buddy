const CC_KEY = 'money_buddy_credit_cards_enabled';

export function getCreditCardsEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(CC_KEY) === 'true';
}

export function setCreditCardsEnabled(val: boolean) {
  localStorage.setItem(CC_KEY, val ? 'true' : 'false');
}
