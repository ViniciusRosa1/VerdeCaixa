const MOBILE_PHONE_LENGTH = 11;

export function phoneDigits(value?: string | null) {
  return (value ?? "").replace(/\D/g, "").slice(0, MOBILE_PHONE_LENGTH);
}

export function formatMobilePhone(value?: string | null) {
  const digits = phoneDigits(value);

  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}
