import { redirect } from 'next/navigation'

export default function Page() {
  // Redirect legacy /create-route to /planner
  redirect('/planner')
}
