import ShootDetailClient from "../../../components/ShootDetailClient";
import { requireAdminPage } from "../../../lib/admin-page";

type PageProps = {
  params: Promise<{ shootId: string }> | { shootId: string };
};

export default async function ShootDetailPage({ params }: PageProps): Promise<React.ReactElement> {
  await requireAdminPage();
  const resolvedParams = await params;

  return (
    <main className="shell">
      <ShootDetailClient shootId={resolvedParams.shootId} />
    </main>
  );
}
