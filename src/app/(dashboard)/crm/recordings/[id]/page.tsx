"use client";

import { useParams } from 'next/navigation';
import { CallRecordingPlayer } from '@/components/communications/CallRecordingPlayer';

export default function RecordingPage() {
  const { id } = useParams<{ id: string }>();
  return <main className="mx-auto w-full min-w-0 max-w-3xl p-4 sm:p-6"><CallRecordingPlayer recordingId={id} /></main>;
}
