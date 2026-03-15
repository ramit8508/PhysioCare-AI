"use client";

import { useMemo } from "react";
import { Clock } from "lucide-react";
type SlotFormProps = {
  action: (formData: FormData) => void | Promise<void>;
};

export default function SlotForm({ action }: SlotFormProps) {
  const tzOffset = useMemo(() => new Date().getTimezoneOffset(), []);
  const minDateTime = useMemo(() => {
    const now = new Date();
    const localIso = new Date(now.getTime() - tzOffset * 60 * 1000)
      .toISOString()
      .slice(0, 16);
    return localIso;
  }, [tzOffset]);

  return (
    <form action={action} className="doctor-slot-form">
      <input type="hidden" name="tzOffset" value={tzOffset} />
      <div className="doctor-form-row">
        <div className="doctor-form-group">
          <label className="doctor-label">Start Time</label>
          <input
            type="datetime-local"
            name="startAt"
            required
            min={minDateTime}
            className="doctor-input"
          />
        </div>
        <div className="doctor-form-group">
          <label className="doctor-label">End Time</label>
          <input
            type="datetime-local"
            name="endAt"
            required
            min={minDateTime}
            className="doctor-input"
          />
        </div>
      </div>
      <button type="submit" className="doctor-button-primary">
        <Clock style={{ width: "18px", height: "18px" }} />
        Add Slot
      </button>
    </form>
  );
}
