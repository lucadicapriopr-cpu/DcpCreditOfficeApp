export function centsToEUR(cents = 0) {
  return (cents / 100).toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}
