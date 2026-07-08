export function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length === 10) {
    return `7${digits}`;
  }

  if (digits.length === 11 && digits.startsWith("8")) {
    return `7${digits.slice(1)}`;
  }

  return digits;
}

export function getWhatsAppUrl(value: string) {
  const phone = normalizePhone(value);
  return phone.length >= 10 ? `https://wa.me/${phone}` : "";
}

export function formatPhoneForDisplay(value: string) {
  const phone = normalizePhone(value);

  if (phone.length === 11 && phone.startsWith("7")) {
    return `+7 ${phone.slice(1, 4)} ${phone.slice(4, 7)} ${phone.slice(7, 9)} ${phone.slice(9)}`;
  }

  return value;
}
