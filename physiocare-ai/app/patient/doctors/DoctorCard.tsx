"use client";

import { useState } from "react";
import Link from "next/link";
import { Award, Calendar, Clock, Star } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";

type Slot = {
  id: string;
  startAt: Date;
  endAt: Date;
};

type Doctor = {
  id: string;
  email: string;
  doctorProfile?: {
    degrees: string | null;
    experienceYears: number | null;
    bio: string | null;
  } | null;
};

type Props = {
  doctor: Doctor;
  slots: Slot[];
  formatDateTime: (date: Date) => string;
  bookSlot: (formData: FormData) => Promise<void>;
};

export default function DoctorCard({ doctor, slots, formatDateTime, bookSlot }: Props) {
  const [bookingSlotId, setBookingSlotId] = useState<string | null>(null);
  const { toast } = useToast();
  const doctorName = doctor.email?.split("@")[0] || "Doctor";

  const handleBookSlot = async (slotId: string) => {
    setBookingSlotId(slotId);
    const formData = new FormData();
    formData.set("slotId", slotId);

    try {
      await bookSlot(formData);
      toast({
        title: "Appointment booked",
        description: "Appointment booked successfully! Waiting for doctor approval.",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Booking failed",
        description: "Failed to book appointment. Please try again.",
      });
    } finally {
      setBookingSlotId(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="patient-doctor-card hover:shadow-xl transition-all duration-300"
    >
      <div className="patient-doctor-info">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="patient-doctor-name">{doctorName}</div>
            <div className="patient-doctor-specialty">
              {doctor.doctorProfile?.degrees || "Physiotherapist"}
            </div>
          </div>
          <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-full border border-amber-200">
            <Star size={14} className="text-amber-500 fill-amber-500" />
            <span className="text-xs font-semibold text-amber-700">4.8</span>
          </div>
        </div>
        <div className="patient-doctor-experience">
          <Award size={14} style={{ display: "inline", marginRight: "6px" }} />
          {doctor.doctorProfile?.experienceYears ?? 0} years of experience
        </div>
      </div>

      <div className="patient-doctor-bio">
        {doctor.doctorProfile?.bio || "Expert in recovery-focused rehabilitation programs."}
      </div>

      <div style={{ marginBottom: "16px" }}>
        <Link
          href={`/patient/doctors/${doctor.id}`}
          className="patient-btn patient-btn-secondary"
          style={{ width: "100%", textAlign: "center" }}
        >
          View Full Profile
        </Link>
      </div>

      <div>
        {slots.length === 0 ? (
          <div
            style={{
              padding: "12px",
              background: "linear-gradient(135deg, rgba(251, 146, 60, 0.05), rgba(249, 115, 22, 0.05))",
              border: "1px solid rgba(251, 146, 60, 0.2)",
              borderRadius: "10px",
              fontSize: "12px",
              color: "#ea580c",
              textAlign: "center",
            }}
          >
            <Clock size={16} style={{ display: "inline", marginRight: "6px" }} />
            No open slots available
          </div>
        ) : (
          <div>
            <div
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "#94a3b8",
                marginBottom: "12px",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Available Slots ({slots.length})
            </div>
            <div className="patient-slots-grid">
              {slots.slice(0, 3).map((slot) => (
                <div key={slot.id} className="patient-slot-item">
                  <div>
                    <div className="patient-slot-time">
                      <Calendar size={14} style={{ display: "inline", marginRight: "6px" }} />
                      {formatDateTime(slot.startAt)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleBookSlot(slot.id)}
                    disabled={bookingSlotId === slot.id}
                    className="patient-btn patient-btn-primary"
                    style={{ fontSize: "12px", padding: "8px 16px" }}
                  >
                    {bookingSlotId === slot.id ? "Booking..." : "Book Now"}
                  </button>
                </div>
              ))}
              {slots.length > 3 && (
                <Link
                  href={`/patient/doctors/${doctor.id}`}
                  className="text-xs text-center text-blue-600 hover:text-blue-700 font-medium py-2"
                >
                  View {slots.length - 3} more slots
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
