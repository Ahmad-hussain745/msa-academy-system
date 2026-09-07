"use client";

import { useState, useTransition } from "react";
import { sendFeeNotification } from "./actions";

// wa.me needs digits only, with country code, no leading +/0. This project
// has no fixed country-code convention on guardian_phone (it's freeform
// text), so this strips non-digits and leaves the number as typed — for a
// number already saved with a country code (e.g. 92XXXXXXXXXX) this works
// as-is; a locally-formatted number (0XXXXXXXXXX) will open WhatsApp with
// an invalid recipient and the staff member will need to fix it there.
// Getting guardian_phone stored in a consistent international format is a
// real, separate cleanup this migration doesn't attempt.
function digitsOnly(phone) {
  return (phone || "").replace(/\D/g, "");
}

export default function SendButtons({ studentId, feeRecordId, guardianPhone, guardianEmail }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const handleSend = (channel) => {
    if (channel !== "email" && !guardianPhone) {
      setError("No guardian phone number on file for this student.");
      return;
    }
    if (channel === "email" && !guardianEmail) {
      setError("No guardian email on file for this student.");
      return;
    }
    setError("");
    const recipient = channel === "email" ? guardianEmail : guardianPhone;

    startTransition(async () => {
      const res = await sendFeeNotification(studentId, feeRecordId, channel, recipient);
      if (res?.error) { setError(res.error); return; }
      setMessage(res.message);

      // Real links, no API key involved — each hands off to the browser's
      // own WhatsApp/SMS/mail handler with the message pre-filled; the
      // staff member hits the actual Send inside that app themselves.
      const encoded = encodeURIComponent(res.message);
      if (channel === "whatsapp") {
        window.open(`https://wa.me/${digitsOnly(guardianPhone)}?text=${encoded}`, "_blank");
      } else if (channel === "sms") {
        window.location.href = `sms:${guardianPhone}?body=${encoded}`;
      } else if (channel === "email") {
        window.location.href = `mailto:${guardianEmail}?subject=${encodeURIComponent("Fee Reminder")}&body=${encoded}`;
      }
    });
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => handleSend("whatsapp")} disabled={pending}
          className="text-xs px-3 py-1.5 rounded-lg bg-sage text-white disabled:opacity-60">
          Send WhatsApp
        </button>
        <button onClick={() => handleSend("sms")} disabled={pending}
          className="text-xs px-3 py-1.5 rounded-lg bg-royal text-white disabled:opacity-60">
          Send SMS
        </button>
        <button onClick={() => handleSend("email")} disabled={pending}
          className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 disabled:opacity-60">
          Send Email
        </button>
      </div>
      {error && <p className="text-xs text-brick mt-2">{error}</p>}
      {message && <p className="text-xs text-slate-400 mt-2">Logged and opened — finish sending in the app that opened.</p>}
    </div>
  );
}
