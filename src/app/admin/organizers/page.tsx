import AdminOrganizersClient from './AdminOrganizersClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Admin · Organizers',
  robots: { index: false, follow: false },
};

export default function AdminOrganizersPage() {
  return <AdminOrganizersClient />;
}
