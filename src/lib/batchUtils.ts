import { parseISO, isAfter, isBefore, isEqual } from "date-fns";

export interface Batch {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  assigned_faculty_id?: string | null;
}

export interface BatchStatus {
  label: string;
  isCompleted: boolean;
  isOngoing: boolean;
  isYetToStart: boolean;
}

export function getBatchStatus(batch: Batch): BatchStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = parseISO(batch.start_date);
  const endDate = parseISO(batch.end_date);
  
  if (isBefore(today, startDate)) {
    return { label: "Yet to Start", isCompleted: false, isOngoing: false, isYetToStart: true };
  } else if (isAfter(today, endDate)) {
    return { label: "Completed", isCompleted: true, isOngoing: false, isYetToStart: false };
  } else {
    return { label: "Ongoing", isCompleted: false, isOngoing: true, isYetToStart: false };
  }
}

export function filterActiveBatches(batches: Batch[]): Batch[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return batches.filter(batch => {
    const endDate = parseISO(batch.end_date);
    return !isAfter(today, endDate); // Not completed
  });
}

export function filterCompletedBatches(batches: Batch[]): Batch[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return batches.filter(batch => {
    const endDate = parseISO(batch.end_date);
    return isAfter(today, endDate); // Completed
  });
}

export function filterOngoingBatches(batches: Batch[]): Batch[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return batches.filter(batch => {
    const startDate = parseISO(batch.start_date);
    const endDate = parseISO(batch.end_date);
    return !isBefore(today, startDate) && !isAfter(today, endDate);
  });
}
