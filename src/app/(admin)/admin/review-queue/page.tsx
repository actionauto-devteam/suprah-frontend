import { redirect } from 'next/navigation';

export default function ReviewQueueRedirect() {
  redirect('/admin/drivers?tab=queue');
}
