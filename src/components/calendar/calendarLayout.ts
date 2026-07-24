import type { Appointment } from "@/types/appointments";

export type PositionedAppointment = {
  appointment: Appointment;
  startMinutes: number;
  endMinutes: number;
  lane: number;
  laneCount: number;
};

export function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function positionAppointments(appointments: Appointment[]) {
  const sorted = [...appointments].sort(
    (first, second) =>
      first.startTime.localeCompare(second.startTime) ||
      first.endTime.localeCompare(second.endTime),
  );
  const positioned: PositionedAppointment[] = [];
  let cluster: PositionedAppointment[] = [];
  let clusterEnd = -1;
  let laneEnds: number[] = [];

  const finishCluster = () => {
    const laneCount = Math.max(1, laneEnds.length);
    cluster.forEach((item) => {
      item.laneCount = laneCount;
    });
    cluster = [];
    laneEnds = [];
    clusterEnd = -1;
  };

  sorted.forEach((appointment) => {
    const startMinutes = timeToMinutes(appointment.startTime);
    const endMinutes = Math.max(
      startMinutes + 1,
      timeToMinutes(appointment.endTime),
    );

    if (cluster.length > 0 && startMinutes >= clusterEnd) finishCluster();

    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= startMinutes);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(endMinutes);
    } else {
      laneEnds[lane] = endMinutes;
    }

    clusterEnd = Math.max(clusterEnd, endMinutes);
    const item = {
      appointment,
      startMinutes,
      endMinutes,
      lane,
      laneCount: 1,
    };
    cluster.push(item);
    positioned.push(item);
  });

  if (cluster.length > 0) finishCluster();
  return positioned;
}
