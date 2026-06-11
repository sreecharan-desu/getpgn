import { REFERRAL_REWARD_SCANS } from "@/lib/referrals";

export function buildReferralShareMessage(link: string): string {
  return `I'm using GetPGN to turn chess scoresheets into validated PGNs. Sign up with my link and we both get +${REFERRAL_REWARD_SCANS} bonus scans: ${link}`;
}

export function buildReferralShareUrls(link: string) {
  const text = buildReferralShareMessage(link);
  const encoded = encodeURIComponent(text);
  return {
    whatsapp: `https://wa.me/?text=${encoded}`,
    x: `https://twitter.com/intent/tweet?text=${encoded}`,
    email: `mailto:?subject=${encodeURIComponent("Try GetPGN — bonus scans")}&body=${encoded}`,
    copy: link,
    native: { title: "GetPGN — bonus scans", text, url: link },
  };
}

export async function shareReferralNative(link: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.share) return false;
  const urls = buildReferralShareUrls(link);
  try {
    await navigator.share(urls.native);
    return true;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return true;
    return false;
  }
}
