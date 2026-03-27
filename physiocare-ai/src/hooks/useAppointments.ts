"use client";

import { useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { getActorHeaders } from "@/lib/actor-context";

type Doctor = {
  id: string;
  email: string;
  fullName: string;
  specialization: string;
  degrees: string;
  experienceYears: number | null;
  availableSlotsCount: number;
  nextAvailableAt: string | null;
  slotsPreview: Array<{ id: string; startAt: string; endAt: string }>;
};

type Appointment = {
  id: string;
  doctorId: string;
  doctorEmail: string;
  doctorName?: string;
  startAt: string;
  endAt: string;
  status: "PENDING" | "APPROVED" | "COMPLETED" | "CANCELED";
  roomId?: string | null;
  meetingUrl?: string | null;
};

export function useAppointments(selectedDoctorId?: string) {
  const { status } = useSession();

  const appointmentsQuery = useQuery({
    queryKey: ["patient-appointments"],
    queryFn: async () => {
      const response = await fetch("/api/patient/appointments", { headers: getActorHeaders("PATIENT") });
      if (!response.ok) {
        return { items: [] };
      }
      return response.json();
    },
    enabled: status !== "loading",
    retry: false,
  });

  const doctorsQuery = useQuery({
    queryKey: ["patient-doctors"],
    queryFn: async () => {
      const response = await fetch("/api/patient/doctors", { headers: getActorHeaders("PATIENT") });
      if (!response.ok) {
        return { items: [] };
      }
      return response.json();
    },
    enabled: status !== "loading",
    retry: false,
  });

  const slotsQuery = useQuery({
    queryKey: ["patient-slots", selectedDoctorId],
    queryFn: async () => {
      if (!selectedDoctorId) {
        return { items: [] };
      }
      const response = await fetch(`/api/patient/slots?doctorId=${selectedDoctorId}`, { headers: getActorHeaders("PATIENT") });
      if (!response.ok) {
        return { items: [] };
      }
      return response.json();
    },
    enabled: status !== "loading" && !!selectedDoctorId,
    retry: false,
  });

  const bookMutation = useMutation({
    mutationFn: async (slotId: string) => {
      const response = await fetch("/api/patient/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getActorHeaders("PATIENT") },
        body: JSON.stringify({ slotId }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || "Unable to book appointment");
      }

      return response.json();
    },
    onSuccess: async () => {
      await Promise.all([
        appointmentsQuery.refetch(),
        doctorsQuery.refetch(),
        slotsQuery.refetch(),
      ]);
    },
  });

  const appointments = useMemo(
    () => (Array.isArray(appointmentsQuery.data?.items) ? (appointmentsQuery.data.items as Appointment[]) : []),
    [appointmentsQuery.data],
  );

  const doctors = useMemo(
    () => (Array.isArray(doctorsQuery.data?.items) ? (doctorsQuery.data.items as Doctor[]) : []),
    [doctorsQuery.data],
  );

  const slots = useMemo(
    () => (Array.isArray(slotsQuery.data?.items) ? slotsQuery.data.items : []),
    [slotsQuery.data],
  );

  return {
    appointments,
    doctors,
    slots,
    isLoading: appointmentsQuery.isLoading || doctorsQuery.isLoading,
    isBooking: bookMutation.isPending,
    bookingError: bookMutation.error instanceof Error ? bookMutation.error.message : null,
    bookSlot: (slotId: string) => bookMutation.mutateAsync(slotId),
    refetchAll: async () => {
      await Promise.all([appointmentsQuery.refetch(), doctorsQuery.refetch(), slotsQuery.refetch()]);
    },
  };
}
